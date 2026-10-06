/**
 * Menen Offline Database — real SQLite-backed implementation.
 *
 * Replaces the C: prototype's localStorage-backed `MenenOfflineDatabase` with a
 * service that reads from / writes to the bundled `menen_offline.db` (via
 * `services/offlineDb`). Keeps the exact same synchronous public API so the
 * ported screens (which call `sqliteDb.*` during render) work unchanged:
 *
 *   - content + user data are hydrated into memory once during `init()`
 *   - reads are synchronous (from memory)
 *   - writes update memory synchronously and are queued to SQLite asynchronously
 *
 * IMPORTANT: Unlike the prototype, this implementation NEVER fabricates user
 * analytics. Streaks, mastery, ESLCE predictions and evaluation summaries are
 * computed exclusively from rows actually recorded by the student.
 */
import { ensureInitialized, executeQuery, executeBatch } from '../services/offlineDb';
import { isContentLoaded, loadBundledJsonContent } from '../services/contentLoader';
import { runSchemaPatch } from './schemaPatch';
import { EVALUATION_THRESHOLDS } from './evaluation';

import type {
  AppMetadata,
  LocalUser,
  Textbook,
  TextbookChapter,
  TextbookSection,
  BasicNote,
  Quiz,
  QuizOption,
  QuizSession,
  QuizAnswer,
  ExamQuestion,
  ExamQuestionOption,
  ExamSession,
  ExamAnswer,
  EslceSubject,
  EslceExam,
  EslcePassage,
  EslceQuestion,
  EslceQuestionOption,
  EslceStudentSession,
  EslceStudentResponse,
  SectionProgress,
  Highlight,
  Bookmark,
  StudyNote,
  StudyActivityLog,
  UserStreak,
  StreakDayStatus,
  QuestionHistoryItem,
  SectionBreakdownItem,
  EslceSubjectPrediction,
  EslcePredictionRecord,
  WeakSectionItem,
  ScopeEvaluationSummary,
  TextbookStudyEvaluation,
  SubjectMasteryItem
} from './types';

import type { PresentationSlideData } from '../components/SlidesPlayer';

interface PresentationSlideRow {
  slide_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  slide_number: number;
  slide_title: string | null;
  basic_presentation: string | null;
  advanced_presentation: string | null;
  ai_presentation: string | null;
  notes: string | null;
  duration_seconds: number | null;
  has_quiz: number | null;
}

const GRADE_MAP: Record<string, string> = {
  G9: 'MID9A',
  G10: 'HIG10A',
  G11: 'HIG11A',
  G12: 'HIG12A'
};

const GRADE_LABELS: Record<string, { code: string; label: string }> = {
  MID9A: { code: 'G9', label: 'Grade 9' },
  HIG10A: { code: 'G10', label: 'Grade 10' },
  HIG11A: { code: 'G11', label: 'Grade 11' },
  HIG12A: { code: 'G12', label: 'Grade 12' }
};

const DEFAULT_GRADE_ID = 'HIG12A';

/**
 * Resolves a DB grade_id (e.g. 'MID9A') to its short code + label.
 * Falls back to parsing the numeric part of the id so an unrecognised grade
 * never silently mislabels itself as Grade 12.
 */
function gradeLabelFor(gradeId: string | undefined | null): { code: string; label: string } {
  const known = gradeId ? GRADE_LABELS[gradeId] : undefined;
  if (known) return known;
  const digits = gradeId ? /(\d{1,2})/.exec(gradeId) : null;
  if (digits) return { code: `G${digits[1]}`, label: `Grade ${digits[1]}` };
  return { code: 'G12', label: 'Grade 12' };
}

const MASTERY_COLORS = ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e'];

function isServer(): boolean {
  return typeof window === 'undefined';
}

class MenenOfflineDatabase {
  // --- metadata layer ---
  private metadata: AppMetadata = {
    grade: 'G12',
    grade_label: 'Grade 12',
    content_version: 1,
    app_name: 'Menen Student Assistant'
  };
  private user: LocalUser | null = null;
  private initialized = false;

  // --- content (hydrated from bundled DB) ---
  private textbooks: Textbook[] = [];
  private chapters: TextbookChapter[] = [];
  private sections: TextbookSection[] = [];
  private basicNotes: BasicNote[] = [];
  private subjectLookup: { subject_id: string; subject_desc: string; category_id: string }[] = [];
  private presentations: PresentationSlideRow[] = [];
  private quizzes: Quiz[] = [];
  private quizOptions: QuizOption[] = [];
  private examQs: ExamQuestion[] = [];
  private examOptions: ExamQuestionOption[] = [];
  private eslceSubjects: EslceSubject[] = [];
  private eslceExams: EslceExam[] = [];
  private eslceQs: EslceQuestion[] = [];
  private eslceOptions: EslceQuestionOption[] = [];
  private eslceExamQuestions: { id: number; exam_id: number; question_id: number; question_number: number }[] = [];
  private eslcePassages: EslcePassage[] = [];
  private eslceQuestionPassages: { id: number; question_id: number; passage_id: number }[] = [];

  // --- user data (hydrated + written) ---
  private sectionProgress: SectionProgress[] = [];
  private quizSessions: QuizSession[] = [];
  private examSessions: ExamSession[] = [];
  private eslceSessions: EslceStudentSession[] = [];
  private eslceResponses: EslceStudentResponse[] = [];
  private highlights: Highlight[] = [];
  private bookmarks: Bookmark[] = [];
  private studyNotes: StudyNote[] = [];
  private activityLogs: StudyActivityLog[] = [];
  private userStreak: UserStreak | null = null;
  private questionHistory: QuestionHistoryItem[] = [];
  private evaluationSummaries: ScopeEvaluationSummary[] = [];
  private eslcePredictions: EslcePredictionRecord[] = [];

  // --- async write queue (SQLite is async; UI reads come from memory) ---
  private writeQueue: Promise<void> = Promise.resolve();

  constructor() {
    // no-op; kinit() must be awaited by the shell gate before rendering screens
  }

  private enqueue(stmts: { sql: string; values?: any[] }[]): void {
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        if (stmts.length > 0) await executeBatch(stmts);
      } catch (e) {
        console.error('[menen-db] write failed', e);
      }
    });
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Ensures SQLite is open, the runtime schema patch has run, bundled content
   * is present (web fallback), and all tables are hydrated into memory.
   * Idempotent — safe to call from the shell gate and from prod hot-path.
   */
  public async init(): Promise<void> {
    if (this.initialized) return;
    await ensureInitialized();
    await runSchemaPatch();

    // Web fallback: content is loaded from bundled JSON into SQLite on first run.
    // Native APK ships menen_offline.db in assets, so this is skipped there.
    if (!isServer()) {
      try {
        const loaded = await isContentLoaded();
        if (!loaded) {
          const gradeId = localStorage.getItem('offlineGrade') || 'HIG12A';
          await loadBundledJsonContent(gradeId);
        }
      } catch (e) {
        console.error('[menen-db] content load skipped', e);
      }
    }

    await this.hydrate();
    await this.ensureMetadataRow();
    this.initialized = true;
  }

  private async hydrate(): Promise<void> {
    const [textbooks, chapters, sections, notes, subj, presentations, quizzes, quizOpts, exQs, exOpts,
      esSubjects, esExams, esQs, esOpts, esExamQs, esPassages, esQPassages,
      progress, qSessions, exams, esSessions, esResponses, hls, bms, sNotes,
      logs, history, summaries, preds, userRows] = await Promise.all([
      this.qAll<Textbook>('SELECT * FROM textbooks'),
      this.qAll<TextbookChapter>('SELECT * FROM textbook_chapters'),
      this.qAll<TextbookSection>('SELECT * FROM textbook_sections'),
      this.qAll<BasicNote>('SELECT * FROM basic_notes'),
      this.qAll<any>('SELECT subject_id, subject_desc, category_id FROM subjects'),
      this.qAll<PresentationSlideRow>('SELECT slide_id, stb_id, chapter_id, section_id, slide_number, slide_title, basic_presentation, advanced_presentation, ai_presentation, notes, duration_seconds, has_quiz FROM presentations'),
      this.qAll<Quiz>('SELECT * FROM quizzes'),
      this.qAll<QuizOption>('SELECT * FROM quiz_options'),
      this.qAll<ExamQuestion>('SELECT * FROM exam_questions'),
      this.qAll<ExamQuestionOption>('SELECT * FROM exam_question_options'),
      this.qAll<EslceSubject>('SELECT * FROM eslce_subjects'),
      this.qAll<EslceExam>('SELECT * FROM eslce_exams'),
      this.qAll<EslceQuestion>('SELECT * FROM eslce_questions'),
      this.qAll<EslceQuestionOption>('SELECT * FROM eslce_question_options'),
      this.qAll<any>('SELECT * FROM eslce_exam_questions'),
      this.qAll<EslcePassage>('SELECT * FROM eslce_passages'),
      this.qAll<any>('SELECT * FROM eslce_question_passages'),
      this.qAll<SectionProgress>('SELECT * FROM section_progress'),
      this.qAll<QuizSession>('SELECT * FROM quiz_sessions ORDER BY COALESCE(completed_at, started_at, ended_at) DESC'),
      this.qAll<ExamSession>('SELECT * FROM exam_sessions ORDER BY COALESCE(completed_at, started_at, ended_at) DESC'),
      this.qAll<EslceStudentSession>('SELECT * FROM eslce_student_sessions ORDER BY COALESCE(created_at, completed_at) DESC'),
      this.qAll<EslceStudentResponse>('SELECT * FROM eslce_student_responses'),
      this.qAll<Highlight>('SELECT * FROM highlights'),
      this.qAll<Bookmark>('SELECT * FROM bookmarks'),
      this.qAll<StudyNote>('SELECT * FROM study_notes'),
      this.qAll<StudyActivityLog>('SELECT * FROM study_activity_logs ORDER BY created_at DESC'),
      this.qAll<QuestionHistoryItem>('SELECT * FROM question_history ORDER BY answered_at DESC'),
      this.qAll<any>('SELECT * FROM evaluation_summaries'),
      this.qAll<any>('SELECT * FROM eslce_predictions ORDER BY computed_at DESC'),
      this.qAll<LocalUser>('SELECT * FROM local_user LIMIT 1')
    ]);

    this.textbooks = textbooks;
    this.chapters = chapters;
    this.sections = sections;
    this.basicNotes = notes;
    this.subjectLookup = subj;
    this.presentations = presentations;
    this.quizzes = quizzes;
    this.quizOptions = quizOpts;
    this.examQs = exQs;
    this.examOptions = exOpts;
    this.eslceSubjects = esSubjects;
    this.eslceExams = esExams;
    this.eslceQs = esQs;
    this.eslceOptions = esOpts;
    this.eslceExamQuestions = esExamQs;
    this.eslcePassages = esPassages;
    this.eslceQuestionPassages = esQPassages;
    this.sectionProgress = progress;
    this.quizSessions = qSessions;
    this.examSessions = exams;
    this.eslceSessions = esSessions;
    this.eslceResponses = esResponses;
    this.highlights = hls;
    this.bookmarks = bms;
    this.studyNotes = sNotes;
    this.activityLogs = logs;
    this.questionHistory = history;
    this.evaluationSummaries = summaries;
    this.eslcePredictions = preds.map(p => ({
      prediction_id: p.prediction_id,
      computed_at: p.computed_at,
      student_grade: p.student_grade,
      total_estimated_score: Number(p.total_estimated_score),
      average_scaled_score: Number(p.average_scaled_score),
      overall_predicted_status: p.overall_predicted_status,
      subject_breakdown: this.safeJson(p.subject_breakdown, []),
      year_over_year_trend: this.safeJson(p.year_over_year_trend, [])
    }));

    if (userRows.length > 0) {
      this.user = userRows[0];
    }
  }

  private async qAll<T>(sql: string): Promise<T[]> {
    try {
      const { values } = await executeQuery<T>(sql);
      return values || [];
    } catch (e) {
      console.error('[menen-db] hydrate query failed:', sql, e);
      return [];
    }
  }

  private safeJson<T>(raw: any, fallback: T): T {
    if (!raw) return fallback;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    }
    return raw as T;
  }

  /**
   * App metadata is derived from the bundled grade's content (the grade is
   * determined by the bundled SQLite database, not hardcoded in code).
   */
  private async ensureMetadataRow(): Promise<void> {
    try {
      const { values } = await executeQuery<any>('SELECT * FROM app_metadata WHERE id = 1 LIMIT 1');
      if (values.length > 0) {
        this.metadata = {
          grade: values[0].grade || 'G12',
          grade_label: values[0].grade_label || 'Grade 12',
          content_version: Number(values[0].content_version || 1),
          app_name: values[0].app_name || 'Menen Student Assistant'
        };
        return;
      }

      const gradeId = this.textbooks[0]?.grade_id || DEFAULT_GRADE_ID;
      const label = gradeLabelFor(gradeId);
      this.metadata = {
        grade: label.code,
        grade_label: label.label,
        content_version: 1,
        app_name: `Menen ${label.code}`
      };
      this.enqueue([
        {
          sql: `INSERT OR REPLACE INTO app_metadata (
            id, grade, grade_label, content_version, app_name, created_at, updated_at
          ) VALUES (1, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          values: [this.metadata.grade, this.metadata.grade_label, this.metadata.content_version, this.metadata.app_name]
        }
      ]);
    } catch (e) {
      console.error('[menen-db] metadata row failed', e);
    }
  }

  // ==========================================================================
  // APP METADATA & USER
  // ==========================================================================

  public getAppMetadata(): AppMetadata {
    return this.metadata;
  }

  public saveMetadata(meta: AppMetadata): void {
    this.metadata = meta;
    this.enqueue([
      {
        sql: `INSERT OR REPLACE INTO app_metadata (
          id, grade, grade_label, content_version, app_name, updated_at
        ) VALUES (1, ?, ?, ?, ?, datetime('now'))`,
        values: [meta.grade, meta.grade_label, meta.content_version, meta.app_name]
      }
    ]);
  }

  /**
   * Simulates swapping the bundled database for another grade while keeping the
   * content that ships in this install (a true multi-grade bundle would swap the
   * actual DB file). Updates the app metadata and local user grade marker.
   */
  public switchBundledDatabaseGrade(gradeKey: 'G9' | 'G10' | 'G11' | 'G12'): AppMetadata {
    const code = gradeKey || 'G12';
    const label = gradeLabelFor(GRADE_MAP[code]);
    const preset: AppMetadata = {
      grade: label.code,
      grade_label: label.label,
      content_version: 1,
      app_name: `Menen ${label.code}`
    };
    this.saveMetadata(preset);
    if (this.user) {
      this.user.grade_id = GRADE_MAP[label.code] || DEFAULT_GRADE_ID;
      this.saveUser(this.user);
    }
    return preset;
  }

  public getLocalUser(): LocalUser | null {
    return this.user;
  }

  public saveUser(user: LocalUser): void {
    this.user = user;
    this.enqueue([
      {
        sql: `INSERT OR REPLACE INTO local_user (
          user_id, display_name, grade_id, pin_hash, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        values: [user.user_id, user.display_name, user.grade_id, user.pin_hash || null, user.created_at, user.updated_at]
      }
    ]);
  }

  public registerUser(name: string): LocalUser {
    const now = new Date().toISOString();
    const newUser: LocalUser = {
      user_id: 'usr_' + Date.now().toString(36),
      display_name: name.trim() || 'Menen Student',
      grade_id: GRADE_MAP[this.metadata.grade] || DEFAULT_GRADE_ID,
      created_at: now,
      updated_at: now
    };
    this.saveUser(newUser);
    return newUser;
  }

  public updateUserName(name: string): void {
    if (this.user) {
      this.user.display_name = name.trim();
      this.user.updated_at = new Date().toISOString();
      this.saveUser(this.user);
    }
  }

  // ==========================================================================
  // CONTENT: TEXTBOOKS / CHAPTERS / SECTIONS / NOTES
  // ==========================================================================

  public getTextbooks(): Textbook[] {
    return this.textbooks;
  }

  public getTextbook(stbId: string): Textbook | undefined {
    return this.textbooks.find(t => t.stb_id === stbId) || this.textbooks[0];
  }

  public getChapters(stbId: string): TextbookChapter[] {
    return this.chapters.filter(c => c.stb_id === stbId);
  }

  public getSections(stbId: string, chapterId: number): TextbookSection[] {
    return this.sections.filter(s => s.stb_id === stbId && s.chapter_id === chapterId);
  }

  public getSection(stbId: string, chapterId: number, sectionId: string): TextbookSection | undefined {
    return this.sections.find(
      s => s.stb_id === stbId && s.chapter_id === chapterId && s.section_id === sectionId
    );
  }

  public getBasicNotes(stbId: string, chapterId: number, sectionId: string): BasicNote[] {
    return this.basicNotes.filter(
      n => n.stb_id === stbId && n.chapter_id === chapterId && n.section_id === sectionId
    );
  }

  public getPresentations(stbId: string, chapterId: number, sectionId: string): PresentationSlideData[] {
    return this.presentations
      .filter(
        p => p.stb_id === stbId && p.chapter_id === chapterId && p.section_id === sectionId
      )
      .sort((a, b) => (a.slide_number || 0) - (b.slide_number || 0))
      .map(p => ({
        slideId: p.slide_id,
        slideNumber: Number(p.slide_number ?? 0),
        slideTitle: p.slide_title ?? '',
        basicPresentation: p.basic_presentation ?? '',
        advancedPresentation: p.advanced_presentation ?? '',
        aiPresentation: p.ai_presentation ?? '',
        notes: p.notes ?? '',
        durationSeconds: Number(p.duration_seconds ?? 0),
        hasQuiz: !!p.has_quiz
      }));
  }

  // ==========================================================================
  // SECTION PROGRESS
  // ==========================================================================

  public getAllSectionProgress(): Record<string, SectionProgress> {
    const map: Record<string, SectionProgress> = {};
    this.sectionProgress.forEach(p => {
      map[`${p.stb_id}_${p.chapter_id}_${p.section_id}`] = p;
    });
    return map;
  }

  public getSectionProgress(stbId: string, chapterId: number, sectionId: string): SectionProgress | undefined {
    return this.sectionProgress.find(
      p => p.stb_id === stbId && p.chapter_id === chapterId && p.section_id === sectionId
    );
  }

  private upsertProgressSQL(p: SectionProgress): { sql: string; values: any[] } {
    return {
      sql: `INSERT INTO section_progress (
        record_id, stb_id, chapter_id, section_id, is_completed, last_accessed,
        time_spent_seconds, quiz_attempts, last_quiz_date, quiz_completed, quiz_score,
        re_read_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stb_id, chapter_id, section_id) DO UPDATE SET
        is_completed = excluded.is_completed,
        last_accessed = excluded.last_accessed,
        time_spent_seconds = excluded.time_spent_seconds,
        quiz_attempts = excluded.quiz_attempts,
        last_quiz_date = excluded.last_quiz_date,
        quiz_completed = excluded.quiz_completed,
        quiz_score = excluded.quiz_score,
        re_read_count = excluded.re_read_count`,
      values: [
        p.record_id, p.stb_id, p.chapter_id, p.section_id, p.is_completed,
        p.last_accessed ?? null, p.time_spent_seconds, p.quiz_attempts,
        p.last_quiz_date ?? null, p.quiz_completed, p.quiz_score ?? null,
        p.re_read_count ?? 0, p.created_at
      ]
    };
  }

  /** Synthesizes the SectionProgress record for the given section and persists it. */
  private touchSectionProgress(stbId: string, chapterId: number, sectionId: string): SectionProgress {
    const now = new Date().toISOString();
    let p = this.getSectionProgress(stbId, chapterId, sectionId);
    if (!p) {
      p = {
        record_id: 'prog_' + Date.now().toString(36),
        stb_id: stbId,
        chapter_id: chapterId,
        section_id: sectionId,
        is_completed: 0,
        time_spent_seconds: 0,
        quiz_attempts: 0,
        quiz_completed: 0,
        re_read_count: 0,
        created_at: now
      };
      this.sectionProgress.push(p);
    }
    return p;
  }

  public recordSectionAccess(stbId: string, chapterId: number, sectionId: string, timeSpentSeconds: number = 90): void {
    const now = new Date().toISOString();
    const p = this.touchSectionProgress(stbId, chapterId, sectionId);
    const isReRead = !!p.last_accessed;
    p.last_accessed = now;
    p.time_spent_seconds = (p.time_spent_seconds || 0) + timeSpentSeconds;
    p.re_read_count = isReRead ? (p.re_read_count || 0) + 1 : (p.re_read_count || 0);
    this.enqueue([this.upsertProgressSQL(p)]);
  }

  public markSectionCompleted(stbId: string, chapterId: number, sectionId: string, isCompleted: boolean): void {
    const now = new Date().toISOString();
    const p = this.touchSectionProgress(stbId, chapterId, sectionId);
    p.is_completed = isCompleted ? 1 : 0;
    p.last_accessed = now;
    p.time_spent_seconds = (p.time_spent_seconds || 0) + 120;
    this.enqueue([this.upsertProgressSQL(p)]);

    if (isCompleted) {
      this.recordStudyActivity(
        'read_section',
        `Completed Section ${sectionId}`,
        `Studied in Textbook ${stbId}, Unit ${chapterId}`
      );
    }
  }

  // ==========================================================================
  // HIGHLIGHTS
  // ==========================================================================

  public getAllHighlights(): Highlight[] {
    return this.highlights;
  }

  public getHighlights(stbId: string, chapterId: number, sectionId: string): Highlight[] {
    return this.highlights.filter(
      h => h.stb_id === stbId && h.chapter_id === chapterId && h.section_id === sectionId
    );
  }

  public addHighlight(highlight: Omit<Highlight, 'highlight_id' | 'created_at' | 'updated_at'>): Highlight {
    const now = new Date().toISOString();
    const newItem: Highlight = {
      ...highlight,
      highlight_id: 'hl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      created_at: now,
      updated_at: now
    };
    this.highlights.push(newItem);
    this.enqueue([{
      sql: `INSERT INTO highlights (
        highlight_id, stb_id, chapter_id, section_id, page_number, text_content,
        highlight_color, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        newItem.highlight_id, newItem.stb_id, newItem.chapter_id, newItem.section_id,
        newItem.page_number ?? null, newItem.text_content, newItem.highlight_color,
        newItem.note ?? null, newItem.created_at, newItem.updated_at
      ]
    }]);
    this.recordStudyActivity(
      'highlight',
      'Saved Key Textbook Passage',
      `Highlighted text in Section ${highlight.section_id}`
    );
    return newItem;
  }

  public deleteHighlight(highlightId: string): void {
    this.highlights = this.highlights.filter(h => h.highlight_id !== highlightId);
    this.enqueue([{ sql: 'DELETE FROM highlights WHERE highlight_id = ?', values: [highlightId] }]);
  }

  // ==========================================================================
  // BOOKMARKS
  // ==========================================================================

  public getBookmarks(): Bookmark[] {
    return this.bookmarks;
  }

  public isBookmarked(stbId: string, chapterId: number, sectionId: string): boolean {
    return this.bookmarks.some(
      b => b.stb_id === stbId && b.chapter_id === chapterId && b.section_id === sectionId
    );
  }

  public toggleBookmark(stbId: string, chapterId: number, sectionId: string, note?: string): boolean {
    const idx = this.bookmarks.findIndex(
      b => b.stb_id === stbId && b.chapter_id === chapterId && b.section_id === sectionId
    );
    if (idx >= 0) {
      const removed = this.bookmarks.splice(idx, 1)[0];
      this.enqueue([{ sql: 'DELETE FROM bookmarks WHERE bookmark_id = ?', values: [removed.bookmark_id] }]);
      return false;
    }
    const now = new Date().toISOString();
    const item: Bookmark = {
      bookmark_id: 'bm_' + Date.now().toString(36),
      stb_id: stbId,
      chapter_id: chapterId,
      section_id: sectionId,
      bookmark_type: 'section_bookmark',
      note: note || '',
      created_at: now,
      updated_at: now
    };
    this.bookmarks.push(item);
    this.enqueue([{
      sql: `INSERT INTO bookmarks (
        bookmark_id, stb_id, chapter_id, section_id, page_number, bookmark_type, note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        item.bookmark_id, item.stb_id, item.chapter_id, item.section_id,
        item.page_number ?? null, item.bookmark_type, item.note ?? null, item.created_at, item.updated_at
      ]
    }]);
    return true;
  }

  // ==========================================================================
  // STUDY NOTES
  // ==========================================================================

  public getAllStudyNotes(): StudyNote[] {
    return this.studyNotes;
  }

  public getStudyNotes(stbId: string, chapterId: number, sectionId: string): StudyNote[] {
    return this.studyNotes.filter(
      n => n.stb_id === stbId && n.chapter_id === chapterId && n.section_id === sectionId
    );
  }

  public addStudyNote(stbId: string, chapterId: number, sectionId: string, noteText: string): StudyNote {
    const now = new Date().toISOString();
    const item: StudyNote = {
      note_id: 'sn_' + Date.now().toString(36),
      stb_id: stbId,
      chapter_id: chapterId,
      section_id: sectionId,
      note_text: noteText,
      created_at: now,
      updated_at: now
    };
    this.studyNotes.push(item);
    this.enqueue([{
      sql: `INSERT INTO study_notes (
        note_id, stb_id, chapter_id, section_id, page_number, note_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        item.note_id, item.stb_id, item.chapter_id, item.section_id,
        item.page_number ?? null, item.note_text, item.created_at, item.updated_at
      ]
    }]);
    this.recordStudyActivity(
      'study_note',
      'Created Study Note',
      `Personal note added for Section ${sectionId}`
    );
    return item;
  }

  // ==========================================================================
  // QUIZZES
  // ==========================================================================

  public getQuizQuestions(stbId?: string, chapterId?: number, sectionId?: string): { quiz: Quiz; options: QuizOption[] }[] {
    let pool = this.quizzes;
    if (stbId) {
      const matches = pool.filter(q => q.stb_id === stbId);
      if (matches.length > 0) pool = matches;
    }
    if (chapterId !== undefined) {
      const matches = pool.filter(q => q.chapter_id === chapterId);
      if (matches.length > 0) pool = matches;
    }
    if (sectionId) {
      const matches = pool.filter(q => q.section_id === sectionId);
      if (matches.length > 0) pool = matches;
    }

    if (pool.length === 0) return [];

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    return selected.map(q => ({
      quiz: q,
      options: this.quizOptions
        .filter(o => o.quiz_id === q.quiz_id)
        .sort((a, b) => a.display_order - b.display_order)
    }));
  }

  public recordQuizSession(
    session: QuizSession,
    answers: QuizAnswer[],
    historyItems?: Omit<QuestionHistoryItem, 'history_id'>[]
  ): {
    scorePercentage: number;
    isWeak: boolean;
    attemptCount: number;
    bestScore: number;
    timePerQuestion: number;
  } {
    const totalQ = Math.max(1, session.total_questions || answers.length || 1);
    const correctCount = answers.filter(a => a.is_correct === 1).length;
    const computedPercentage = EvaluationOf.computePercentageScore(correctCount, totalQ);
    const timePerQ = totalQ > 0 ? Math.round((session.time_spent_seconds || 30) / totalQ) : 3;

    const sectionSessions = this.quizSessions.filter(
      s => s.stb_id === session.stb_id &&
        s.chapter_id === session.chapter_id &&
        s.section_id === session.section_id
    );
    const attemptCount = sectionSessions.length + 1;
    const bestScore = Math.max(computedPercentage, ...sectionSessions.map(s => s.overall_score || 0), 0);

    const finalizedSession: QuizSession = {
      ...session,
      overall_score: computedPercentage,
      attempt_number: attemptCount
    };
    this.quizSessions.unshift(finalizedSession);

    if (historyItems && historyItems.length > 0) this.recordQuestionHistoryBatch(historyItems);

    // update section progress quiz stats
    if (session.stb_id && session.chapter_id !== undefined && session.section_id) {
      const p = this.touchSectionProgress(session.stb_id, session.chapter_id, session.section_id);
      p.quiz_attempts = (p.quiz_attempts || 0) + 1;
      p.quiz_completed = 1;
      p.quiz_score = computedPercentage;
      p.last_quiz_date = new Date().toISOString();
      this.enqueue([this.upsertProgressSQL(p)]);
    } else {
      // remediation practice has no real section key; just touch activity below
    }

    const stmts: { sql: string; values?: any[] }[] = [
      {
        sql: `INSERT INTO quiz_sessions (
          session_id, stb_id, chapter_id, section_id, session_type, started_at,
          completed_at, overall_score, ended_at, attempt_number, quiz_type,
          total_questions, time_spent_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          finalizedSession.session_id, finalizedSession.stb_id ?? null,
          finalizedSession.chapter_id ?? null, finalizedSession.section_id ?? null,
          finalizedSession.session_type ?? null, finalizedSession.started_at,
          finalizedSession.completed_at ?? null, finalizedSession.overall_score ?? null,
          finalizedSession.ended_at ?? null, finalizedSession.attempt_number,
          finalizedSession.quiz_type ?? null, finalizedSession.total_questions,
          finalizedSession.time_spent_seconds
        ]
      }
    ];

    // quiz_answers has an FK to quizzes(); synthesized remediation questions are
    // not real content rows, so only persist answers whose quiz exists in content.
    for (const a of answers) {
      const known = this.quizzes.some(q => q.quiz_id === a.quiz_id);
      if (!known) continue;
      stmts.push({
        sql: `INSERT INTO quiz_answers (
          answer_id, quiz_id, session_id, answer_text, points, answered_at, is_correct, question_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [a.answer_id, a.quiz_id, a.session_id, a.answer_text, a.points, a.answered_at, a.is_correct, a.question_order ?? null]
      });
    }

    this.enqueue(stmts);

    this.refreshEvaluationSummaries();
    this.recordStudyActivity(
      'quiz_session',
      `Completed ${session.quiz_type || 'Section'} Quiz`,
      `Score: ${computedPercentage}% (${correctCount}/${totalQ} correct) • Attempt #${attemptCount}`
    );

    return {
      scorePercentage: computedPercentage,
      isWeak: computedPercentage < 60,
      attemptCount,
      bestScore,
      timePerQuestion: timePerQ
    };
  }

  public getSectionQuizStats(stbId: string, chapterId: number, sectionId: string): {
    attemptCount: number;
    bestScore: number;
    latestScore: number;
    averageScore: number;
    isWeak: boolean;
  } {
    const sessions = this.quizSessions.filter(
      s => s.stb_id === stbId && s.chapter_id === chapterId && s.section_id === sectionId
    );
    if (sessions.length === 0) {
      return { attemptCount: 0, bestScore: 0, latestScore: 0, averageScore: 0, isWeak: false };
    }
    const scores = sessions.map(s => s.overall_score || 0);
    const bestScore = Math.max(...scores);
    const latestScore = scores[0];
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { attemptCount: sessions.length, bestScore, latestScore, averageScore, isWeak: averageScore < 60 };
  }

  public getQuizSessions(): QuizSession[] {
    return this.quizSessions;
  }

  public getMissedCountForQuestion(questionId: string | number): number {
    const id = String(questionId);
    return this.questionHistory.filter(h => String(h.question_id) === id && h.was_correct === 0).length;
  }

  // ==========================================================================
  // EXAMS
  // ==========================================================================

  public getExamQuestions(stbId?: string, chapterId?: number): { question: ExamQuestion; options: ExamQuestionOption[] }[] {
    let pool = this.examQs;
    if (stbId) {
      const matches = pool.filter(q => q.stb_id === stbId);
      if (matches.length > 0) pool = matches;
    }
    if (chapterId !== undefined) {
      const matches = pool.filter(q => q.chapter_id === chapterId);
      if (matches.length > 0) pool = matches;
    }
    if (pool.length === 0) return [];

    return pool.map(q => ({
      question: q,
      options: this.examOptions
        .filter(o => o.question_id === q.question_id)
        .sort((a, b) => a.display_order - b.display_order)
    }));
  }

  public getPreviousExamAttempt(stbId: string, chapterId: number): ExamSession | undefined {
    return this.examSessions.find(e => e.stb_id === stbId && e.chapter_id === chapterId);
  }

  public recordExamSession(
    session: ExamSession,
    answers: ExamAnswer[],
    historyItems?: Omit<QuestionHistoryItem, 'history_id'>[],
    _breakdown?: SectionBreakdownItem[]
  ): {
    scorePercentage: number;
    passed: boolean;
    previousScore?: number;
    scoreDiff?: number;
    improved?: boolean;
  } {
    const previousAttempt = session.stb_id && session.chapter_id !== undefined
      ? this.getPreviousExamAttempt(session.stb_id, session.chapter_id)
      : undefined;

    const totalQ = Math.max(1, session.total_questions || answers.length || 1);
    const computedPercentage = EvaluationOf.computePercentageScore(session.correct_answers, totalQ);
    const passed = computedPercentage >= EVALUATION_THRESHOLDS.EXAM_PASS_PERCENTAGE;

    const finalizedSession: ExamSession = {
      ...session,
      overall_score: computedPercentage
    };
    this.examSessions.unshift(finalizedSession);

    if (historyItems && historyItems.length > 0) this.recordQuestionHistoryBatch(historyItems);

    const stmts: { sql: string; values?: any[] }[] = [
      {
        sql: `INSERT INTO exam_sessions (
          session_id, stb_id, chapter_id, section_id, session_type, started_at,
          completed_at, overall_score, ended_at, total_questions, correct_answers,
          wrong_answers, time_spent_seconds, attempt_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          finalizedSession.session_id, finalizedSession.stb_id ?? null,
          finalizedSession.chapter_id ?? null, finalizedSession.section_id ?? null,
          finalizedSession.session_type ?? null, finalizedSession.started_at,
          finalizedSession.completed_at ?? null, finalizedSession.overall_score ?? null,
          finalizedSession.ended_at ?? null, finalizedSession.total_questions ?? null,
          finalizedSession.correct_answers, finalizedSession.wrong_answers,
          finalizedSession.time_spent_seconds, finalizedSession.attempt_number
        ]
      }
    ];

    for (const a of answers) {
      stmts.push({
        sql: `INSERT INTO exam_answers (
          answer_id, question_id, answer_text, points, answered_at, session_id,
          response_time_seconds, is_correct, attempt_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          a.answer_id, a.question_id, a.answer_text, a.points, a.answered_at,
          a.session_id, a.response_time_seconds, a.is_correct, a.attempt_order ?? null
        ]
      });
    }

    this.enqueue(stmts);
    this.refreshEvaluationSummaries();

    const prevScore = previousAttempt?.overall_score;
    const scoreDiff = prevScore !== undefined ? computedPercentage - prevScore : undefined;
    const improved = scoreDiff !== undefined ? scoreDiff > 0 : undefined;

    this.recordStudyActivity(
      'exam_session',
      `Completed Chapter ${session.chapter_id || 1} Exam (${session.session_type || 'practice'})`,
      `Score: ${computedPercentage}% • ${passed ? 'PASSED' : 'NEEDS REVISION'} (${session.correct_answers}/${totalQ})`
    );

    return { scorePercentage: computedPercentage, passed, previousScore: prevScore, scoreDiff, improved };
  }

  public getExamSessions(): ExamSession[] {
    return this.examSessions;
  }

  // ==========================================================================
  // ESLCE
  // ==========================================================================

  public getEslceSubjects(): EslceSubject[] {
    return this.eslceSubjects;
  }

  // Predicted papers are synthesized on the fly from the generated question
  // bank (source_type='generated'), mirroring the web backend's virtual exams.
  // Synthetic ids start at VIRTUAL_ESLCE_EXAM_BASE so they can never collide
  // with the real eslce_exams ids (web backend uses 90000 + offset too).
  public readonly VIRTUAL_ESLCE_EXAM_BASE = 90000;

  private buildVirtualEslceExams(): EslceExam[] {
    const virtualExams: EslceExam[] = [];
    let offset = 0;
    for (const subject of this.eslceSubjects) {
      const count = this.eslceQs.filter(q => q.subject_id === subject.id && q.source_type === 'generated').length;
      if (count === 0) continue;
      offset += 1;
      virtualExams.push({
        id: this.VIRTUAL_ESLCE_EXAM_BASE + offset,
        subject_id: subject.id,
        year: 2026,
        semester: 'First Semester',
        type: 'Predicted',
        title: `${subject.name} Predicted 2026`,
        total_questions: count,
        total_marks: count,
        duration_minutes: Math.round(count * 1.2),
        exam_type: 'predicted',
        virtual: true
      });
    }
    return virtualExams;
  }

  public getEslceExams(subjectId?: number, year?: number, examType?: string): EslceExam[] {
    let list: EslceExam[] = [...this.eslceExams, ...this.buildVirtualEslceExams()];
    if (subjectId) list = list.filter(e => e.subject_id === subjectId);
    if (year) list = list.filter(e => e.year === year);
    if (examType) list = list.filter(e => e.exam_type === examType);
    return list;
  }

  public getEslceExamDetail(examId: number) {
    const isVirtual = examId >= this.VIRTUAL_ESLCE_EXAM_BASE;
    const exam = (isVirtual ? this.buildVirtualEslceExams() : this.eslceExams).find(e => e.id === examId);
    if (!exam) return null;
    const subject = this.eslceSubjects.find(s => s.id === exam.subject_id) || this.eslceSubjects[0];

    const questionIds = isVirtual
      ? this.eslceQs
          .filter(q => q.subject_id === exam.subject_id && q.source_type === 'generated')
          .map(q => q.id)
      : this.eslceExamQuestions
          .filter(m => m.exam_id === examId)
          .sort((a, b) => a.question_number - b.question_number)
          .map(m => m.question_id);

    const questions = questionIds.map(questionId => {
      const question = this.eslceQs.find(q => q.id === questionId);
      if (!question) return null;
      const options = this.eslceOptions
        .filter(o => o.question_id === question.id)
        .sort((a, b) => a.display_order - b.display_order);
      const passageMap = this.eslceQuestionPassages.find(p => p.question_id === question.id);
      const passage = passageMap ? this.eslcePassages.find(p => p.id === passageMap.passage_id) : undefined;
      return { question, options, passage };
    }).filter(
      (q): q is { question: EslceQuestion; options: EslceQuestionOption[]; passage: EslcePassage | undefined } =>
        q !== null
    );

    return { exam, subject, questions };
  }

  public recordEslceSession(
    session: EslceStudentSession,
    responses: EslceStudentResponse[],
    historyItems?: Omit<QuestionHistoryItem, 'history_id'>[]
  ): {
    estimatedScaledScore: number;
    passedSubject: boolean;
    percentage: number;
  } {
    const totalQ = Math.max(1, session.total_questions || responses.length || 1);
    const percentage = EvaluationOf.computePercentageScore(session.correct_count, totalQ);
    const estimatedScaledScore = EvaluationOf.computeEslceScaledScore(session.correct_count, totalQ);
    const passedSubject = estimatedScaledScore >= EVALUATION_THRESHOLDS.ESLCE_SUBJECT_PASS_SCALED;

    const finalizedSession: EslceStudentSession = {
      ...session,
      percentage
    };
    this.eslceSessions.unshift(finalizedSession);
    this.eslceResponses.push(...responses);

    if (historyItems && historyItems.length > 0) this.recordQuestionHistoryBatch(historyItems);

    const stmts: { sql: string; values?: any[] }[] = [
      {
        sql: `INSERT INTO eslce_student_sessions (
          id, session_key, subject_name, exam_id, exam_type, mode, source_year,
          title, total_questions, correct_count, wrong_count, unanswered_count,
          percentage, time_spent_ms, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          finalizedSession.id, finalizedSession.session_key, finalizedSession.subject_name ?? null,
          finalizedSession.exam_id ?? null, finalizedSession.exam_type, finalizedSession.mode,
          finalizedSession.source_year ?? null, finalizedSession.title ?? null,
          finalizedSession.total_questions, finalizedSession.correct_count, finalizedSession.wrong_count,
          finalizedSession.unanswered_count, finalizedSession.percentage ?? null,
          finalizedSession.time_spent_ms ?? null, finalizedSession.created_at,
          finalizedSession.completed_at ?? null
        ]
      }
    ];

    for (const r of responses) {
      stmts.push({
        sql: `INSERT INTO eslce_student_responses (
          session_id, question_id, selected_option_id, is_correct, verdict, response_time_ms, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        values: [
          finalizedSession.id, r.question_id, r.selected_option_id ?? null,
          r.is_correct ?? 0, r.verdict, r.response_time_ms ?? null, r.created_at
        ]
      });
    }

    this.enqueue(stmts);

    this.calculateAndStoreEslcePrediction();
    this.refreshEvaluationSummaries();

    this.recordStudyActivity(
      'eslce_session',
      'ESLCE National Exam Practice',
      `${session.subject_name || 'Curriculum'} ${session.source_year || 2016} E.C. - Estimated ${estimatedScaledScore}/700 (${percentage}%)`
    );

    return { estimatedScaledScore, passedSubject, percentage };
  }

  public getEslceSessions(): EslceStudentSession[] {
    return this.eslceSessions;
  }

  // ==========================================================================
  // APP SETTINGS (key/value) — used by the offline verifier (licensing.ts)
  // ==========================================================================

  public getSetting(key: string): Promise<string | null> {
    return executeQuery<{ value: string | null }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [key]
    ).then(({ values }) => (values[0]?.value ?? null), () => null);
  }

  public setSetting(key: string, value: string): void {
    this.enqueue([
      {
        sql: `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
              VALUES (?, ?, datetime('now'))`,
        values: [key, value]
      }
    ]);
  }

  /**
   * Number of free-plan ESLCE practice runs already used today. The free tier
   * is capped (FREE_DAILY_PRACTICE_LIMIT); the cap resets each local day.
   */
  public countTodayPracticeSessions(): number {
    const today = this.getLocalDateString(new Date());
    return this.eslceSessions.filter(
      s => s.mode === 'practice' && s.created_at && s.created_at.slice(0, 10) === today
    ).length;
  }

  // ==========================================================================
  // ACTIVITY STREAK
  // ==========================================================================

  private getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public getActivityLogs(): StudyActivityLog[] {
    return this.activityLogs;
  }

  public recordStudyActivity(
    type: StudyActivityLog['activity_type'],
    title: string,
    details?: string,
    customDate?: string
  ): void {
    const activityDate = customDate || this.getLocalDateString(new Date());
    const now = new Date().toISOString();
    const newActivity: StudyActivityLog = {
      activity_id: 'act_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      activity_date: activityDate,
      activity_type: type,
      title,
      details: details || `Recorded on ${activityDate}`,
      duration_seconds: 300,
      created_at: now
    };
    this.activityLogs.unshift(newActivity);
    this.enqueue([{
      sql: `INSERT INTO study_activity_logs (
        activity_id, activity_date, activity_type, title, details, duration_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      values: [
        newActivity.activity_id, newActivity.activity_date, newActivity.activity_type,
        newActivity.title, newActivity.details ?? null, newActivity.duration_seconds ?? 0, newActivity.created_at
      ]
    }]);
    this.recalculateAndSaveStreak();
  }

  public logManualStudyCheckin(title: string = 'Daily Curriculum Review', details: string = 'Completed focused offline study'): void {
    this.recordStudyActivity('manual_checkin', title, details);
  }

  public simulateStudyDay(daysAgo: number): void {
    const targetDate = new Date(Date.now() - daysAgo * 86400000);
    const dateStr = this.getLocalDateString(targetDate);
    this.recordStudyActivity('read_section', `Curriculum Study (Day -${daysAgo})`, 'Logged study session in local database', dateStr);
  }

  public recalculateAndSaveStreak(): UserStreak {
    const uniqueDatesSet = new Set<string>();
    this.activityLogs.forEach(l => {
      if (l.activity_date) uniqueDatesSet.add(l.activity_date);
    });

    const todayStr = this.getLocalDateString(new Date());
    const yesterdayDate = new Date(Date.now() - 86400000);
    const yesterdayStr = this.getLocalDateString(yesterdayDate);

    const studiedToday = uniqueDatesSet.has(todayStr);
    const studiedYesterday = uniqueDatesSet.has(yesterdayStr);

    let streak = 0;
    if (studiedToday) {
      let checkDate = new Date();
      while (true) {
        const key = this.getLocalDateString(checkDate);
        if (uniqueDatesSet.has(key)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else break;
      }
    } else if (studiedYesterday) {
      let checkDate = yesterdayDate;
      while (true) {
        const key = this.getLocalDateString(checkDate);
        if (uniqueDatesSet.has(key)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else break;
      }
    } else {
      streak = 0;
    }

    const prevLongest = this.userStreak?.longest_streak || 0;
    const updatedStreak: UserStreak = {
      user_id: this.user?.user_id || 'usr_offline',
      current_streak: streak,
      longest_streak: Math.max(prevLongest, streak),
      last_activity_date: Array.from(uniqueDatesSet).sort().reverse()[0] || undefined,
      total_days_studied: uniqueDatesSet.size,
      updated_at: new Date().toISOString()
    };
    this.userStreak = updatedStreak;
    this.enqueue([{
      sql: `INSERT OR REPLACE INTO user_streak (
        user_id, current_streak, longest_streak, last_activity_date, total_days_studied, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      values: [
        updatedStreak.user_id, updatedStreak.current_streak, updatedStreak.longest_streak,
        updatedStreak.last_activity_date ?? null, updatedStreak.total_days_studied, updatedStreak.updated_at
      ]
    }]);
    return updatedStreak;
  }

  public getStreakInfo() {
    const streak = this.recalculateAndSaveStreak();
    const todayStr = this.getLocalDateString(new Date());
    const activeDatesSet = new Set(this.activityLogs.map(l => l.activity_date));
    const studiedToday = activeDatesSet.has(todayStr);

    const weekHistory: StreakDayStatus[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dStr = this.getLocalDateString(d);
      weekHistory.push({
        date: dStr,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        hasStudied: activeDatesSet.has(dStr),
        isToday: i === 0,
        isFuture: false
      });
    }

    const count = streak.current_streak;
    let motivational: {
      badge: string;
      headline: string;
      message: string;
      culturalTag: string;
      level: 'start' | 'active' | 'blazing' | 'master' | 'legend';
    };

    if (count === 0) {
      motivational = {
        level: 'start',
        badge: 'Day 0 • Ready',
        headline: 'Kickstart Your Study Streak Today!',
        message: 'Consistent daily study is the single greatest predictor of high scores in national Ethiopian exams. Read a section or take a 10-question quiz now to start Day 1!',
        culturalTag: 'ጀምር! (Begin Today)'
      };
    } else if (count === 1) {
      motivational = {
        level: 'active',
        badge: '1-Day Streak • Spark',
        headline: studiedToday ? 'Day 1 Complete — Strong Beginning!' : 'Day 1 Preserved — Keep It Burning!',
        message: studiedToday
          ? 'You took positive action today. Reviewing regularly creates permanent neural pathways. Come back tomorrow to earn your 2-Day badge!'
          : 'You studied yesterday! Complete a quick quiz or textbook section today to extend your streak to 2 consecutive days.',
        culturalTag: 'መልካም ጅማሮ! (Good Start)'
      };
    } else if (count >= 2 && count <= 4) {
      motivational = {
        level: 'active',
        badge: `${count}-Day Streak • On Fire`,
        headline: `${count} Days in a row! Momentum is building.`,
        message: studiedToday
          ? `Solid discipline! ${count} consecutive days of studying builds automatic learning habits. You are absorbing the ${this.metadata.grade_label} curriculum rapidly.`
          : `⚡ Your ${count}-day streak is waiting! Take 5 minutes to complete a section or quiz before midnight to keep the momentum going.`,
        culturalTag: 'በርታ! (Keep Pushing)'
      };
    } else if (count >= 5 && count <= 9) {
      motivational = {
        level: 'blazing',
        badge: `${count}-Day Streak • Unstoppable`,
        headline: `Superb dedication! ${count}-Day Streak achieved.`,
        message: studiedToday
          ? `A ${count}-day streak proves serious academic grit. You are covering units with depth, putting yourself in top standing for regional and national exams.`
          : `🔥 Don't let your impressive ${count}-day streak cool down! A quick review session today locks in your score.`,
        culturalTag: 'ጎበዝ! (Outstanding Effort)'
      };
    } else if (count >= 10 && count <= 19) {
      motivational = {
        level: 'master',
        badge: `${count}-Day Streak • Scholar Elite`,
        headline: `Exceptional mastery! ${count} Days of continuous study.`,
        message: studiedToday
          ? `Incredible fortitude! Studying ${count} consecutive days places you among the most dedicated students in Ethiopia. Your exam confidence is soaring.`
          : `🏆 Protect your prized ${count}-day streak! One study action today keeps your streak blazing bright.`,
        culturalTag: 'ድንቅ ትጋት! (Remarkable Diligence)'
      };
    } else {
      motivational = {
        level: 'legend',
        badge: `${count}-Day Streak • National Distinction`,
        headline: `Legendary ${count}-Day Streak! National distinction within reach.`,
        message: studiedToday
          ? `Legendary commitment! With ${count} days of consecutive study, you are primed for outstanding performance in the national ESLCE.`
          : `🌟 Your legendary ${count}-day streak is an inspiration! Study today to maintain this extraordinary standard.`,
        culturalTag: 'ምርጥ ውጤት! (Top Excellence)'
      };
    }

    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      studiedToday,
      lastActivityDate: streak.last_activity_date,
      totalDaysStudied: streak.total_days_studied,
      weekHistory,
      motivational
    };
  }

  // ==========================================================================
  // DASHBOARD AGGREGATIONS
  // ==========================================================================

  public getDashboardStats() {
    const allProgress = this.sectionProgress;
    const textbooksCompleted = allProgress.filter(p => p.is_completed === 1).length;

    const quizSessions = this.quizSessions;
    const examSessions = this.examSessions;
    const eslceSessions = this.eslceSessions;
    const totalQuizzes = quizSessions.length + examSessions.length + eslceSessions.length;

    let totalScore = 0;
    let scoredCount = 0;
    quizSessions.forEach(q => {
      if (q.overall_score !== undefined && !isNaN(q.overall_score)) { totalScore += q.overall_score; scoredCount++; }
    });
    examSessions.forEach(e => {
      if (e.overall_score !== undefined && !isNaN(e.overall_score)) { totalScore += e.overall_score; scoredCount++; }
    });
    eslceSessions.forEach(es => {
      if (es.percentage !== undefined && !isNaN(es.percentage)) { totalScore += es.percentage; scoredCount++; }
    });

    const averageScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    const streakInfo = this.getStreakInfo();

    return {
      gradeLabel: this.metadata.grade_label,
      gradeCode: this.metadata.grade,
      appName: this.metadata.app_name,
      studyStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      studiedToday: streakInfo.studiedToday,
      streakInfo,
      textbooksCompleted,
      quizzesTaken: totalQuizzes,
      averageScore,
      totalStudyTimeMinutes: Math.round(allProgress.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0) / 60)
    };
  }

  // ==========================================================================
  // EVALUATION LAYER
  // ==========================================================================

  public recordQuestionHistoryBatch(items: Omit<QuestionHistoryItem, 'history_id'>[]): void {
    const newItems: QuestionHistoryItem[] = items.map((item, i) => ({
      ...item,
      history_id: 'qhist_' + Date.now().toString(36) + '_' + i + '_' + Math.random().toString(36).substring(2, 5)
    }));
    this.questionHistory.unshift(...newItems);

    const stmts: { sql: string; values?: any[] }[] = newItems.map(item => ({
      sql: `INSERT INTO question_history (
        history_id, question_id, assessment_type, question_text, selected_answer,
        correct_answer, was_correct, time_spent_ms, answered_at, stb_id, chapter_id,
        section_id, subject_name, explanation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        item.history_id, item.question_id, item.assessment_type, item.question_text,
        item.selected_answer, item.correct_answer, item.was_correct, item.time_spent_ms,
        item.answered_at, item.stb_id ?? null, item.chapter_id ?? null,
        item.section_id ?? null, item.subject_name ?? null, item.explanation ?? null
      ]
    }));
    this.enqueue(stmts);
  }

  public getQuestionHistory(questionId?: string): QuestionHistoryItem[] {
    if (questionId) {
      return this.questionHistory.filter(item => String(item.question_id) === String(questionId));
    }
    return this.questionHistory;
  }

  public getMissedQuestions(limit: number = 8): QuestionHistoryItem[] {
    const missed = this.questionHistory.filter(h => h.was_correct === 0);
    const seen = new Set<string>();
    const unique: QuestionHistoryItem[] = [];
    for (let i = 0; i < missed.length; i++) {
      const q = missed[i];
      if (!seen.has(q.question_text)) {
        seen.add(q.question_text);
        unique.push(q);
      }
      if (unique.length >= limit) break;
    }
    return unique;
  }

  /**
   * Targeted Remediation Practice Mode source.
   * Only questions the student has missed in TWO OR MORE past sessions are
   * surfaced, ranked by how often they were missed.
   */
  public getAdaptiveRemediationQuestions(
    limit: number = 10
  ): { quiz: Quiz; options: QuizOption[]; missedCount: number; originalItem?: QuestionHistoryItem }[] {
    const history = this.questionHistory;
    const missMap = new Map<string, { count: number; lastItem: QuestionHistoryItem }>();
    history.forEach(item => {
      if (item.was_correct === 0) {
        const existing = missMap.get(item.question_id) || { count: 0, lastItem: item };
        existing.count += 1;
        existing.lastItem = item;
        missMap.set(item.question_id, existing);
      }
    });

    // Feature: only questions missed 2+ times are eligible for targeted practice
    const eligible = Array.from(missMap.values()).filter(d => d.count >= 2);
    eligible.sort((a, b) => b.count - a.count);

    const results: { quiz: Quiz; options: QuizOption[]; missedCount: number; originalItem?: QuestionHistoryItem }[] = [];
    const usedTexts = new Set<string>();

    for (const data of eligible) {
      const qid = data.lastItem.question_id;
      const match = this.quizzes.find(q => q.quiz_id === qid);
      if (match && !usedTexts.has(match.quiz_text)) {
        usedTexts.add(match.quiz_text);
        results.push({
          quiz: match,
          options: this.quizOptions.filter(o => o.quiz_id === match.quiz_id).sort((a, b) => a.display_order - b.display_order),
          missedCount: data.count,
          originalItem: data.lastItem
        });
      } else if (!usedTexts.has(data.lastItem.question_text)) {
        usedTexts.add(data.lastItem.question_text);
        const item = data.lastItem;
        const syntheticQuiz: Quiz = {
          quiz_id: 'rem_' + qid,
          quiz_type_id: 'MCQ',
          stb_id: item.stb_id || 'REMEDIATION_ADAPTIVE',
          chapter_id: item.chapter_id || 1,
          section_id: item.section_id || 'S1.1',
          subject_id: 'SUB_REM',
          quiz_text: item.question_text,
          explanation: item.explanation || `Correct answer is: ${item.correct_answer}`,
          points: 1,
          difficulty: 'Medium',
          time_limit_minutes: 2,
          allow_retake: 1
        };
        const options: QuizOption[] = [
          {
            record_id: 'rem_opt_corr_' + qid,
            quiz_id: syntheticQuiz.quiz_id,
            option_label: 'A',
            option_text: item.correct_answer,
            explanation: item.explanation || 'Correct solution according to curriculum specification.',
            is_correct: 1,
            display_order: 1
          },
          {
            record_id: 'rem_opt_inc1_' + qid,
            quiz_id: syntheticQuiz.quiz_id,
            option_label: 'B',
            option_text: item.selected_answer && item.selected_answer !== item.correct_answer
              ? item.selected_answer
              : 'A different alternative',
            explanation: 'Incorrect previous selection',
            is_correct: 0,
            display_order: 2
          },
          {
            record_id: 'rem_opt_inc2_' + qid,
            quiz_id: syntheticQuiz.quiz_id,
            option_label: 'C',
            option_text: 'None of the other options',
            explanation: 'Incorrect distractor',
            is_correct: 0,
            display_order: 3
          },
          {
            record_id: 'rem_opt_inc3_' + qid,
            quiz_id: syntheticQuiz.quiz_id,
            option_label: 'D',
            option_text: 'Not sure — review the topic',
            explanation: 'Incomplete understanding',
            is_correct: 0,
            display_order: 4
          }
        ];
        options.sort(() => 0.5 - Math.random());
        options.forEach((opt, idx) => {
          opt.option_label = String.fromCharCode(65 + idx);
          opt.display_order = idx + 1;
        });
        results.push({ quiz: syntheticQuiz, options, missedCount: data.count, originalItem: item });
      }
      if (results.length >= limit) break;
    }

    return results;
  }

  /** Builds per-subject mastery from REAL recorded assessments only. */
  public getSubjectMasteryBreakdown(): SubjectMasteryItem[] {
    const booksBySubject = new Map<string, Textbook[]>();
    this.textbooks.forEach(t => {
      const arr = booksBySubject.get(t.subject_id) || [];
      arr.push(t);
      booksBySubject.set(t.subject_id, arr);
    });

    const progressList = this.getAllSectionProgress();
    const subjectIds = Array.from(booksBySubject.keys());

    return subjectIds.map((subjectId, idx) => {
      const books = booksBySubject.get(subjectId) || [];
      const stbIds = new Set(books.map(b => b.stb_id));
      const subjectName = this.subjectLookup.find(s => s.subject_id === subjectId)?.subject_desc ||
        (books[0]?.title || 'Subject');

      const subjectScores: number[] = [];
      this.quizSessions.forEach(q => {
        if (q.stb_id && stbIds.has(q.stb_id) && q.overall_score !== undefined) subjectScores.push(q.overall_score);
      });
      this.examSessions.forEach(e => {
        if (e.stb_id && stbIds.has(e.stb_id) && e.overall_score !== undefined) subjectScores.push(e.overall_score);
      });
      this.eslceSessions.forEach(es => {
        if (es.subject_name?.toLowerCase().includes(subjectName.toLowerCase()) && es.percentage !== undefined) {
          subjectScores.push(es.percentage);
        }
      });

      let totalSecs = 0;
      let completedSecs = 0;
      books.forEach(b => {
        this.getChapters(b.stb_id).forEach(c => {
          const secs = this.getSections(b.stb_id, c.chapter_id);
          totalSecs += secs.length;
          secs.forEach(s => {
            if (progressList[`${b.stb_id}_${c.chapter_id}_${s.section_id}`]?.is_completed === 1) {
              completedSecs += 1;
            }
          });
        });
      });

      const bookProgress = totalSecs > 0 ? Math.min(100, Math.round((completedSecs / totalSecs) * 100)) : 0;
      const avgScore = subjectScores.length > 0
        ? Math.min(100, Math.round(subjectScores.reduce((a, b) => a + b, 0) / subjectScores.length))
        : 0;

      return {
        subject_id: subjectId,
        subject_name: subjectName,
        category: 'NAT_SCI' as const,
        average_score: avgScore,
        assessments_count: subjectScores.length,
        pass_status: (avgScore >= EVALUATION_THRESHOLDS.EXAM_PASS_PERCENTAGE ? 'PASS' : 'NEEDS_REVISION') as 'PASS' | 'NEEDS_REVISION',
        color: MASTERY_COLORS[idx % MASTERY_COLORS.length],
        textbook_progress_percent: bookProgress
      };
    });
  }

  public getWeakSections(threshold: number = 60): WeakSectionItem[] {
    const sectionMap = new Map<string, { totalScore: number; attempts: number; latestDate: string; stbId: string; chapterId: number; sectionId: string }>();

    this.quizSessions.forEach(q => {
      if (q.stb_id && q.chapter_id !== undefined && q.section_id && q.overall_score !== undefined) {
        const key = `${q.stb_id}_${q.chapter_id}_${q.section_id}`;
        const existing = sectionMap.get(key) || {
          totalScore: 0,
          attempts: 0,
          latestDate: q.completed_at || q.started_at || '',
          stbId: q.stb_id,
          chapterId: q.chapter_id,
          sectionId: q.section_id
        };
        existing.totalScore += q.overall_score;
        existing.attempts += 1;
        sectionMap.set(key, existing);
      }
    });

    const weakSections: WeakSectionItem[] = [];
    sectionMap.forEach(stat => {
      const avg = Math.round(stat.totalScore / stat.attempts);
      if (avg < threshold) {
        const section = this.getSection(stat.stbId, stat.chapterId, stat.sectionId);
        weakSections.push({
          section_id: stat.sectionId,
          section_title: section?.section_title || `Section ${stat.sectionId}`,
          stb_id: stat.stbId,
          chapter_id: stat.chapterId,
          average_score: avg,
          attempts: stat.attempts,
          last_attempted_at: stat.latestDate
        });
      }
    });

    return weakSections.sort((a, b) => a.average_score - b.average_score);
  }

  public refreshEvaluationSummaries(): void {
    const allAssessments: { score: number; passed: boolean }[] = [];

    this.quizSessions.forEach(q => {
      if (q.overall_score !== undefined) {
        allAssessments.push({ score: Math.min(100, q.overall_score), passed: q.overall_score >= 60 });
      }
    });
    this.examSessions.forEach(e => {
      if (e.overall_score !== undefined) {
        allAssessments.push({ score: Math.min(100, e.overall_score), passed: e.overall_score >= 50 });
      }
    });
    this.eslceSessions.forEach(es => {
      if (es.percentage !== undefined) {
        allAssessments.push({ score: Math.min(100, es.percentage), passed: es.percentage >= 50 });
      }
    });

    const totalAssessments = allAssessments.length;
    const avgScore = totalAssessments > 0
      ? Math.min(100, Math.round(allAssessments.reduce((a, x) => a + x.score, 0) / totalAssessments))
      : 0;
    const bestScore = totalAssessments > 0 ? Math.max(...allAssessments.map(a => a.score)) : 0;
    const latestScore = allAssessments[0]?.score ?? 0;
    const passedCount = allAssessments.filter(a => a.passed).length;
    const failedCount = totalAssessments - passedCount;

    const weakSections = this.getWeakSections(60);
    const strongSections = this.getStrongSections();

    let percentile = 0;
    if (totalAssessments > 0) {
      if (avgScore >= 95) percentile = 99;
      else if (avgScore >= 90) percentile = 96;
      else if (avgScore >= 85) percentile = 91;
      else if (avgScore >= 80) percentile = 85;
      else if (avgScore >= 75) percentile = 78;
      else if (avgScore >= 70) percentile = 70;
      else if (avgScore >= 60) percentile = 58;
      else if (avgScore >= 50) percentile = 48;
      else percentile = 35;
    }

    const mastery = this.getSubjectMasteryBreakdown();
    const assessed = mastery.filter(m => m.assessments_count > 0).sort((a, b) => a.average_score - b.average_score);
    const weakestSubject = assessed.length > 0 ? assessed[0].subject_name : undefined;
    const strongestSubject = assessed.length > 0 ? assessed[assessed.length - 1].subject_name : undefined;

    const overallSummary: ScopeEvaluationSummary = {
      scope_type: 'overall',
      scope_id: 'overall_main',
      title: `${this.metadata.grade_label} Overall Mastery`,
      total_assessments: totalAssessments,
      average_score: avgScore,
      best_score: bestScore,
      latest_score: latestScore,
      passed_count: passedCount,
      failed_count: failedCount,
      weak_sections: weakSections,
      strong_sections: strongSections,
      weakest_subject: weakestSubject,
      strongest_subject: strongestSubject,
      grade_level_percentile: percentile,
      last_evaluated_at: new Date().toISOString()
    };
    this.evaluationSummaries = [overallSummary];

    this.enqueue([
      { sql: 'DELETE FROM evaluation_summaries' },
      {
        sql: `INSERT INTO evaluation_summaries (
          summary_id, scope_type, scope_id, title, total_assessments, average_score,
          best_score, latest_score, passed_count, failed_count, weakest_subject,
          strongest_subject, grade_level_percentile, weak_sections, strong_sections, last_evaluated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          'eval_overall_main', overallSummary.scope_type, overallSummary.scope_id, overallSummary.title,
          overallSummary.total_assessments, overallSummary.average_score, overallSummary.best_score,
          overallSummary.latest_score, overallSummary.passed_count, overallSummary.failed_count,
          overallSummary.weakest_subject ?? null, overallSummary.strongest_subject ?? null,
          overallSummary.grade_level_percentile ?? 0,
          JSON.stringify(overallSummary.weak_sections), JSON.stringify(overallSummary.strong_sections),
          overallSummary.last_evaluated_at
        ]
      }
    ]);
  }

  private getStrongSections(): { section_id: string; section_title: string; average_score: number }[] {
    const sectionMap = new Map<string, { totalScore: number; attempts: number; stbId: string; chapterId: number; sectionId: string }>();
    this.quizSessions.forEach(q => {
      if (q.stb_id && q.chapter_id !== undefined && q.section_id && q.overall_score !== undefined) {
        const key = `${q.stb_id}_${q.chapter_id}_${q.section_id}`;
        const existing = sectionMap.get(key) || { totalScore: 0, attempts: 0, stbId: q.stb_id, chapterId: q.chapter_id, sectionId: q.section_id };
        existing.totalScore += q.overall_score;
        existing.attempts += 1;
        sectionMap.set(key, existing);
      }
    });
    const strong: { section_id: string; section_title: string; average_score: number }[] = [];
    sectionMap.forEach(stat => {
      const avg = Math.round(stat.totalScore / stat.attempts);
      if (avg >= 60) {
        const section = this.getSection(stat.stbId, stat.chapterId, stat.sectionId);
        strong.push({ section_id: stat.sectionId, section_title: section?.section_title || `Section ${stat.sectionId}`, average_score: avg });
      }
    });
    return strong.sort((a, b) => b.average_score - a.average_score);
  }

  public getScopeEvaluationSummary(): ScopeEvaluationSummary {
    const s = this.evaluationSummaries[0];
    if (s) return s;
    return {
      scope_type: 'overall',
      scope_id: 'overall_main',
      title: `${this.metadata.grade_label} Overall Mastery`,
      total_assessments: 0,
      average_score: 0,
      best_score: 0,
      latest_score: 0,
      passed_count: 0,
      failed_count: 0,
      weak_sections: [],
      strong_sections: [],
      grade_level_percentile: 0,
      last_evaluated_at: new Date().toISOString()
    };
  }

  // ==========================================================================
  // ESLCE PREDICTION ENGINE — computed ONLY from actual recorded sessions
  // ==========================================================================

  public getEslcePredictions(): EslcePredictionRecord[] {
    return this.eslcePredictions;
  }

  public getLatestEslcePrediction(): EslcePredictionRecord | null {
    return this.eslcePredictions[0] || null;
  }

  public calculateAndStoreEslcePrediction(): EslcePredictionRecord {
    const eslceSessions = this.eslceSessions;
    const subjects = this.eslceSubjects;

    const subjectBreakdown: EslceSubjectPrediction[] = subjects.map(s => {
      const matchingSessions = eslceSessions.filter(sess => sess.subject_name === s.name);
      let raw = 0;
      let total = 0;
      let timeSec = 0;

      if (matchingSessions.length > 0) {
        const lastSession = matchingSessions[0];
        raw = lastSession.correct_count;
        total = lastSession.total_questions || 60;
        timeSec = lastSession.time_spent_ms ? Math.round(lastSession.time_spent_ms / (total * 1000)) : 0;
      }

      const accuracy = total > 0 ? Math.min(100, Math.round((raw / total) * 100)) : 0;
      const scaled = total > 0 ? Math.min(700, Math.round((raw / total) * 700)) : 0;
      const passed = scaled >= EVALUATION_THRESHOLDS.ESLCE_SUBJECT_PASS_SCALED;

      return {
        subject_id: s.id,
        subject_name: s.name,
        raw_score: raw,
        total_marks: total,
        accuracy_percentage: accuracy,
        estimated_scaled_score: scaled,
        passed,
        time_per_question_sec: timeSec
      };
    });

    const totalScaled = subjectBreakdown.reduce((acc, sub) => acc + sub.estimated_scaled_score, 0);
    const avgScaled = subjectBreakdown.length > 0 ? Math.round(totalScaled / subjectBreakdown.length) : 0;
    const overallPassed = avgScaled >= EVALUATION_THRESHOLDS.ESLCE_SUBJECT_PASS_SCALED;

    // year-over-year trend from real attempts only (grouped by source year).
    // Predicted-paper sessions are deliberately excluded so a synthesized
    // "2026" bar is never added to the real official-paper trend.
    const yearMap = new Map<number, { total: number; count: number }>();
    eslceSessions.forEach(sess => {
      if (!sess.source_year || sess.percentage === undefined || sess.exam_type === 'predicted') return;
      const entry = yearMap.get(sess.source_year) || { total: 0, count: 0 };
      entry.total += sess.percentage;
      entry.count += 1;
      yearMap.set(sess.source_year, entry);
    });
    const yearOverYearTrend = Array.from(yearMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, agg]) => ({
        year,
        estimated_scaled: Math.round((agg.total / agg.count) * 7),
        percentage: Math.round(agg.total / agg.count)
      }));

    const record: EslcePredictionRecord = {
      prediction_id: 'pred_' + Date.now().toString(36),
      computed_at: new Date().toISOString(),
      student_grade: this.metadata.grade,
      subject_breakdown: subjectBreakdown,
      total_estimated_score: totalScaled,
      average_scaled_score: avgScaled,
      overall_predicted_status: overallPassed ? 'PASS' : 'FAIL',
      year_over_year_trend: yearOverYearTrend
    };

    // Only persist once the student has actually attempted a national paper.
    if (eslceSessions.length > 0) {
      this.eslcePredictions.unshift(record);
      this.eslcePredictions = this.eslcePredictions.slice(0, 10);
      this.enqueue([
        {
          sql: 'DELETE FROM eslce_predictions WHERE prediction_id = ?',
          values: [record.prediction_id]
        },
        {
          sql: `INSERT INTO eslce_predictions (
            prediction_id, computed_at, student_grade, total_estimated_score,
            average_scaled_score, overall_predicted_status, subject_breakdown, year_over_year_trend
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          values: [
            record.prediction_id, record.computed_at, record.student_grade,
            record.total_estimated_score, record.average_scaled_score, record.overall_predicted_status,
            JSON.stringify(record.subject_breakdown), JSON.stringify(record.year_over_year_trend)
          ]
        }
      ]);
    } else {
      // Not yet meaningful — do not surface a fabricated prediction.
      this.eslcePredictions = [];
    }

    return record;
  }

  // ==========================================================================
  // STUDY EVALUATION
  // ==========================================================================

  public getTextbookStudyEvaluations(): TextbookStudyEvaluation[] {
    return this.textbooks.map(tb => {
      const chapters = this.getChapters(tb.stb_id);
      let totalSections = 0;
      chapters.forEach(ch => {
        totalSections += this.getSections(tb.stb_id, ch.chapter_id).length;
      });

      const bookProgress = this.sectionProgress.filter(p => p.stb_id === tb.stb_id);
      const completedSections = bookProgress.filter(p => p.is_completed === 1).length;
      const totalTimeSpentSeconds = bookProgress.reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0);
      const totalReReads = bookProgress.reduce((acc, p) => acc + (p.re_read_count || 0), 0);

      const completionPercentage = totalSections > 0
        ? Math.min(100, Math.round((completedSections / totalSections) * 100))
        : 0;
      const avgTimePerSec = completedSections > 0
        ? Math.round(totalTimeSpentSeconds / completedSections)
        : (bookProgress.length > 0 ? Math.round(totalTimeSpentSeconds / bookProgress.length) : 0);

      return {
        stb_id: tb.stb_id,
        title: tb.title,
        subject_id: tb.subject_id,
        total_sections: totalSections,
        completed_sections: completedSections,
        completion_percentage: completionPercentage,
        total_time_spent_seconds: totalTimeSpentSeconds,
        avg_time_per_section_seconds: avgTimePerSec,
        highlights_count: this.highlights.filter(h => h.stb_id === tb.stb_id).length,
        bookmarks_count: this.bookmarks.filter(b => b.stb_id === tb.stb_id).length,
        notes_count: this.studyNotes.filter(n => n.stb_id === tb.stb_id).length,
        re_reads_count: totalReReads
      };
    });
  }

  public getOverallStudyEvaluation(): {
    totalSections: number;
    completedSections: number;
    completionPercentage: number;
    totalTimeSpentMinutes: number;
    totalHighlights: number;
    totalBookmarks: number;
    totalNotes: number;
    totalReReads: number;
  } {
    const evals = this.getTextbookStudyEvaluations();
    const totalSections = evals.reduce((a, e) => a + e.total_sections, 0);
    const completedSections = evals.reduce((a, e) => a + e.completed_sections, 0);
    const totalTimeSpentSeconds = evals.reduce((a, e) => a + e.total_time_spent_seconds, 0);
    const totalHighlights = evals.reduce((a, e) => a + e.highlights_count, 0);
    const totalBookmarks = evals.reduce((a, e) => a + e.bookmarks_count, 0);
    const totalNotes = evals.reduce((a, e) => a + e.notes_count, 0);
    const totalReReads = evals.reduce((a, e) => a + e.re_reads_count, 0);

    const completionPercentage = totalSections > 0
      ? Math.min(100, Math.round((completedSections / totalSections) * 100))
      : 0;

    return {
      totalSections,
      completedSections,
      completionPercentage,
      totalTimeSpentMinutes: Math.round(totalTimeSpentSeconds / 60),
      totalHighlights,
      totalBookmarks,
      totalNotes,
      totalReReads
    };
  }

  // ==========================================================================
  // COMPLETE DASHBOARD ANALYTICS
  // ==========================================================================

  public getDashboardAnalytics() {
    const summary = this.getScopeEvaluationSummary();
    const streakInfo = this.getStreakInfo();
    const weakSections = this.getWeakSections(60);
    const studyEval = this.getOverallStudyEvaluation();
    const eslcePrediction = this.getLatestEslcePrediction();

    let recommendedAction: {
      title: string;
      subtitle: string;
      actionText: string;
      stbId: string;
      chapterId: number;
      sectionId: string;
      type: 'study' | 'quiz';
    } | null = null;

    if (weakSections.length > 0) {
      const topWeak = weakSections[0];
      recommendedAction = {
        title: topWeak.section_title,
        subtitle: `Scored ${topWeak.average_score}% across ${topWeak.attempts} attempt(s). Needs immediate revision.`,
        actionText: `Retake ${topWeak.section_id} Quiz`,
        stbId: topWeak.stb_id,
        chapterId: topWeak.chapter_id,
        sectionId: topWeak.section_id,
        type: 'quiz'
      };
    } else if (summary.total_assessments === 0 && this.textbooks.length > 0) {
      const firstBook = this.textbooks[0];
      const firstChapter = this.getChapters(firstBook.stb_id)[0];
      if (firstChapter) {
        const firstSection = this.getSections(firstBook.stb_id, firstChapter.chapter_id)[0];
        if (firstSection) {
          recommendedAction = {
            title: firstSection.section_title,
            subtitle: 'No assessments recorded yet — start by studying this section or taking a practice quiz.',
            actionText: 'Start Studying',
            stbId: firstBook.stb_id,
            chapterId: firstChapter.chapter_id,
            sectionId: firstSection.section_id,
            type: 'study'
          };
        }
      }
    }

    return {
      gradeLabel: this.metadata.grade_label,
      gradeCode: this.metadata.grade,
      appName: this.metadata.app_name,
      overallAverage: summary.average_score,
      weakestSubject: summary.weakest_subject || 'Awaiting assessment data',
      strongestSubject: summary.strongest_subject || 'Awaiting assessment data',
      totalAssessments: summary.total_assessments,
      studyStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      studiedToday: streakInfo.studiedToday,
      streakInfo,
      gradeLevelPercentile: summary.grade_level_percentile || 0,
      textbookCompletionPercentage: studyEval.completionPercentage,
      weakSections,
      recommendedAction,
      studyEval,
      eslcePrediction
    };
  }

  // ==========================================================================
  // RESET USER PROGRESS
  // ==========================================================================

  public resetUserProgress(): void {
    const deletes = [
      'section_progress', 'quiz_sessions', 'quiz_answers', 'exam_sessions',
      'exam_answers', 'eslce_student_sessions', 'eslce_student_responses',
      'highlights', 'bookmarks', 'study_notes', 'study_activity_logs',
      'user_streak', 'question_history', 'evaluation_summaries', 'eslce_predictions'
    ];
    this.enqueue(deletes.map(t => ({ sql: `DELETE FROM ${t}` })));

    this.sectionProgress = [];
    this.quizSessions = [];
    this.examSessions = [];
    this.eslceSessions = [];
    this.eslceResponses = [];
    this.highlights = [];
    this.bookmarks = [];
    this.studyNotes = [];
    this.activityLogs = [];
    this.userStreak = null;
    this.questionHistory = [];
    this.evaluationSummaries = [];
    this.eslcePredictions = [];
  }
}

// Temp name to avoid circular-ish reference: evaluation module reads this singleton
class EvaluationOf {
  static computePercentageScore(correct: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((correct / total) * 100)));
  }

  static computeEslceScaledScore(rawScore: number, totalQuestions: number): number {
    if (totalQuestions <= 0) return 0;
    return Math.min(700, Math.max(0, Math.round((rawScore / totalQuestions) * 700)));
  }
}

export const sqliteDb = new MenenOfflineDatabase();

/** Async init gate used by the offline app root before rendering the shell. */
export async function initMenenDatabase(): Promise<void> {
  await sqliteDb.init();
}