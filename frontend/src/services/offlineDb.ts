/**
 * Offline Database Service
 * Handles SQLite operations for the offline app mode.
 * Uses @capacitor-community/sqlite for native SQLite access.
 *
 * On Android: loads pre-bundled menen_offline.db from assets.
 * On Web: uses jeep-sqlite in-memory or from JSON content.
 */
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const DB_NAME = 'menen_offline';

let db: SQLiteDBConnection | null = null;
let sqlite: SQLiteConnection | null = null;
let isWeb = false;

export async function initOfflineDb(): Promise<void> {
  const platform = Capacitor.getPlatform();
  isWeb = platform === 'web';

  sqlite = new SQLiteConnection(CapacitorSQLite);

  if (isWeb) {
    // Web requires jeep-sqlite to be loaded
    await customElements.whenDefined('jeep-sqlite');
    await sqlite.initWebStore();
  }

  // On native, import the bundled database from assets BEFORE opening connections
  if (!isWeb) {
    await importBundledDatabaseFromAssets();
  }

  const ret = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;

  if (ret.result && isConn) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
  }

  await db.open();
  await db.execute('PRAGMA foreign_keys = ON;');
}

/**
 * Import the bundled SQLite database from Android assets on first launch.
 * Uses copyFromAssets() to copy menen_offline.db from the assets folder
 * into the app's internal storage.
 */
async function importBundledDatabaseFromAssets(): Promise<void> {
  if (!sqlite) return;

  try {
    // Check if database already exists in internal storage
    const dbExists = await sqlite.isDatabase(DB_NAME);
    if (dbExists.result) {
      console.log('Offline DB already exists, skipping asset copy.');
      return;
    }

    // Database not found — copy from bundled assets
    console.log('Copying offline database from bundled assets...');
    await sqlite.copyFromAssets(false);
    console.log('Offline database copied from assets successfully.');
  } catch (err) {
    console.log('Bundled database copy skipped (expected on web):', err);
  }
}

export async function closeOfflineDb(): Promise<void> {
  if (db) {
    await sqlite?.closeConnection(DB_NAME, false);
    db = null;
  }
}

export function getDb(): SQLiteDBConnection {
  if (!db) throw new Error('Offline database not initialized. Call initOfflineDb() first.');
  return db;
}

export async function executeQuery<T = any>(
  sql: string,
  values?: any[]
): Promise<{ values: T[]; changes: number }> {
  const conn = getDb();
  if (values && values.length > 0) {
    const result = await conn.query(sql, values);
    return { values: (result.values || []) as T[], changes: (result as any).changes ?? 0 };
  }
  const result = await conn.query(sql);
  return { values: (result.values || []) as T[], changes: (result as any).changes ?? 0 };
}

export async function executeRun(
  sql: string,
  values?: any[]
): Promise<{ changes: number; lastId: number }> {
  const conn = getDb();
  const result = values && values.length > 0
    ? await conn.run(sql, values)
    : await conn.run(sql);
  const changes = (result as any).changes ?? 0;
  const lastId = (result as any).lastId ?? (result as any).lastInsertRowId ?? 0;
  return { changes, lastId };
}

export async function executeBatch(statements: { sql: string; values?: any[] }[]): Promise<void> {
  const conn = getDb() as any;
  const sqls = statements.map(s => {
    if (s.values && s.values.length > 0) {
      return { sql: s.sql, values: s.values };
    }
    return { sql: s.sql };
  });
  if (conn.executeBatch) {
    await conn.executeBatch(sqls);
  } else {
    for (const s of sqls) {
      if (s.values) {
        await conn.run(s.sql, s.values);
      } else {
        await conn.run(s.sql);
      }
    }
  }
}

// ============================================================================
// Content queries (bundled, read-only)
// ============================================================================

export async function getTextbooks(gradeId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM textbooks WHERE grade_id = ? ORDER BY subject_id',
    [gradeId]
  );
  return values;
}

export async function getChapters(stbId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM textbook_chapters WHERE stb_id = ? ORDER BY chapter_id',
    [stbId]
  );
  return values;
}

export async function getSections(stbId: string, chapterId?: number) {
  if (chapterId !== undefined) {
    const { values } = await executeQuery(
      'SELECT * FROM textbook_sections WHERE stb_id = ? AND chapter_id = ? ORDER BY section_id',
      [stbId, chapterId]
    );
    return values;
  }
  const { values } = await executeQuery(
    'SELECT * FROM textbook_sections WHERE stb_id = ? ORDER BY chapter_id, section_id',
    [stbId]
  );
  return values;
}

export async function getSectionContent(stbId: string, chapterId: number, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT section_content FROM textbook_sections WHERE stb_id = ? AND chapter_id = ? AND section_id = ?',
    [stbId, chapterId, sectionId]
  );
  return values[0]?.section_content ?? null;
}

export async function getBasicNotes(stbId: string, chapterId: number, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM basic_notes WHERE stb_id = ? AND chapter_id = ? AND section_id = ?',
    [stbId, chapterId, sectionId]
  );
  return values[0] ?? null;
}

export async function getPresentations(stbId: string, chapterId: number, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM presentations WHERE stb_id = ? AND chapter_id = ? AND section_id = ? ORDER BY slide_number',
    [stbId, chapterId, sectionId]
  );
  return values;
}

// ============================================================================
// Quiz queries (content)
// ============================================================================

export async function getQuizzes(stbId: string, chapterId: number, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM quizzes WHERE stb_id = ? AND chapter_id = ? AND section_id = ?',
    [stbId, chapterId, sectionId]
  );
  for (const quiz of values) {
    const { values: opts } = await executeQuery(
      'SELECT * FROM quiz_options WHERE quiz_id = ? ORDER BY display_order',
      [quiz.quiz_id]
    );
    quiz.options = opts;
  }
  return values;
}

export async function getQuizTextbooks() {
  const { values } = await executeQuery(`
    SELECT t.stb_id, t.title as textbook_title, s.subject_desc as subject_name,
           COUNT(q.quiz_id) as total,
           0 as completed,
           0 as progress_percentage
    FROM textbooks t
    LEFT JOIN subjects s ON t.subject_id = s.subject_id
    LEFT JOIN quizzes q ON t.stb_id = q.stb_id
    GROUP BY t.stb_id
    ORDER BY s.subject_desc
  `);
  return values;
}

export async function getQuizChapters(stbId: string) {
  const { values } = await executeQuery(`
    SELECT c.chapter_id, c.chapter_title,
           COUNT(q.quiz_id) as total,
           0 as completed
    FROM textbook_chapters c
    LEFT JOIN quizzes q ON c.stb_id = q.stb_id AND c.chapter_id = q.chapter_id
    WHERE c.stb_id = ?
    GROUP BY c.chapter_id
    ORDER BY c.chapter_id
  `, [stbId]);
  return values;
}

export async function getQuizSections(stbId: string, chapterId: number) {
  const { values } = await executeQuery(`
    SELECT s.section_id, s.section_title,
           COUNT(q.quiz_id) as question_count,
           0 as is_completed
    FROM textbook_sections s
    LEFT JOIN quizzes q ON s.stb_id = q.stb_id AND s.chapter_id = q.chapter_id AND s.section_id = q.section_id
    WHERE s.stb_id = ? AND s.chapter_id = ?
    GROUP BY s.section_id
    ORDER BY s.section_id
  `, [stbId, chapterId]);
  return values;
}

// ============================================================================
// Exam queries (content)
// ============================================================================

export async function getExamTextbooks() {
  const { values } = await executeQuery(`
    SELECT t.stb_id, t.title as textbook_title, s.subject_desc as subject_name,
           COUNT(eq.question_id) as total
    FROM textbooks t
    LEFT JOIN subjects s ON t.subject_id = s.subject_id
    LEFT JOIN exam_questions eq ON t.stb_id = eq.stb_id
    GROUP BY t.stb_id
    ORDER BY s.subject_desc
  `);
  return values;
}

export async function getExamSections(stbId: string, chapterId?: number) {
  let sql = `
    SELECT eq.chapter_id, eq.section_id, COUNT(*) as question_count
    FROM exam_questions eq
    WHERE eq.stb_id = ?
  `;
  const params: any[] = [stbId];
  if (chapterId !== undefined) {
    sql += ' AND eq.chapter_id = ?';
    params.push(chapterId);
  }
  sql += ' GROUP BY eq.chapter_id, eq.section_id ORDER BY eq.chapter_id, eq.section_id';
  const { values } = await executeQuery(sql, params);
  return values;
}

export async function getExamQuestions(stbId: string, chapterId: number, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM exam_questions WHERE stb_id = ? AND chapter_id = ? AND section_id = ?',
    [stbId, chapterId, sectionId]
  );
  for (const q of values) {
    const { values: opts } = await executeQuery(
      'SELECT * FROM exam_question_options WHERE question_id = ? ORDER BY display_order',
      [q.question_id]
    );
    q.options = opts;
  }
  return values;
}

export async function getExamQuestionCount(stbId: string, sectionId: string) {
  const { values } = await executeQuery(
    'SELECT COUNT(*) as count FROM exam_questions WHERE stb_id = ? AND section_id = ?',
    [stbId, sectionId]
  );
  return values[0]?.count ?? 0;
}

// ============================================================================
// ESLCE queries (content)
// ============================================================================

export async function getEslceSubjects() {
  const { values } = await executeQuery('SELECT * FROM eslce_subjects ORDER BY name');
  return values;
}

export async function getEslceExams(filters?: { subject_id?: number; exam_type?: string }) {
  let sql = 'SELECT e.*, es.name as subject_name, es.code as subject_code FROM eslce_exams e JOIN eslce_subjects es ON e.subject_id = es.id WHERE 1=1';
  const params: any[] = [];
  if (filters?.subject_id) {
    sql += ' AND e.subject_id = ?';
    params.push(filters.subject_id);
  }
  if (filters?.exam_type) {
    sql += ' AND e.exam_type = ?';
    params.push(filters.exam_type);
  }
  sql += ' ORDER BY e.year DESC, es.name';
  const { values } = await executeQuery(sql, params);
  return values;
}

export async function getEslceExamDetail(examId: number) {
  const { values } = await executeQuery(
    'SELECT e.*, es.name as subject_name, es.code as subject_code FROM eslce_exams e JOIN eslce_subjects es ON e.subject_id = es.id WHERE e.id = ?',
    [examId]
  );
  return values[0] ?? null;
}

export async function getEslceQuestions(examId: number) {
  const { values } = await executeQuery(`
    SELECT q.*, eqq.question_number, eqq.marks_allocated
    FROM eslce_questions q
    JOIN eslce_exam_questions eqq ON q.id = eqq.question_id
    WHERE eqq.exam_id = ?
    ORDER BY eqq.question_number
  `, [examId]);

  for (const q of values) {
    const { values: opts } = await executeQuery(
      'SELECT * FROM eslce_question_options WHERE question_id = ? ORDER BY display_order',
      [q.id]
    );
    q.options = opts;

    // Get passage if any
    const { values: passages } = await executeQuery(`
      SELECT p.* FROM eslce_passages p
      JOIN eslce_question_passages qp ON p.id = qp.passage_id
      WHERE qp.question_id = ?
    `, [q.id]);
    if (passages.length > 0) {
      q.passage = passages[0];
    }
  }
  return values;
}

// ============================================================================
// User data queries (local, read-write)
// ============================================================================

export async function getOrCreateUser(displayName: string, gradeId: string) {
  const { values } = await executeQuery('SELECT * FROM local_user LIMIT 1');
  if (values.length > 0) return values[0];

  const userId = 'USR' + Date.now().toString().slice(-7);
  await executeRun(
    'INSERT INTO local_user (user_id, display_name, grade_id) VALUES (?, ?, ?)',
    [userId, displayName, gradeId]
  );
  return { user_id: userId, display_name: displayName, grade_id: gradeId };
}

export async function getSettings() {
  const { values } = await executeQuery('SELECT * FROM app_settings');
  const settings: Record<string, string> = {};
  for (const v of values) settings[v.key] = v.value;
  return settings;
}

export async function setSetting(key: string, value: string) {
  await executeRun(
    'INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    [key, value]
  );
}

// ============================================================================
// Progress queries (user data)
// ============================================================================

export async function markSectionCompleted(stbId: string, chapterId: number, sectionId: string) {
  await executeRun(`
    INSERT OR REPLACE INTO section_progress
    (record_id, stb_id, chapter_id, section_id, is_completed, last_accessed, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `, [crypto.randomUUID(), stbId, chapterId, sectionId]);
}

export async function getSectionProgress(stbId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM section_progress WHERE stb_id = ?',
    [stbId]
  );
  return values;
}

export async function getOverviewStats(gradeId: string) {
  const { values } = await executeQuery(`
    SELECT
      (SELECT COUNT(*) FROM textbooks WHERE grade_id = ?) as textbook_count,
      (SELECT COUNT(*) FROM section_progress WHERE is_completed = 1) as sections_completed,
      (SELECT COUNT(*) FROM textbook_sections) as total_sections,
      (SELECT COUNT(*) FROM quiz_sessions) as quiz_count,
      (SELECT COUNT(*) FROM exam_sessions) as exam_count,
      (SELECT COUNT(*) FROM eslce_student_sessions) as eslce_count,
      (SELECT COALESCE(AVG(overall_score), 0) FROM quiz_sessions WHERE overall_score IS NOT NULL) as avg_quiz_score,
      (SELECT COALESCE(AVG(overall_score), 0) FROM exam_sessions WHERE overall_score IS NOT NULL) as avg_exam_score
  `, [gradeId]);
  return values[0] ?? {};
}

// ============================================================================
// Session recording (user data)
// ============================================================================

export async function recordQuizSession(session: {
  stb_id?: string;
  chapter_id?: number;
  section_id?: string;
  session_type?: string;
  total_questions: number;
  total_points?: number;
  time_spent_seconds: number;
  answers: { quiz_id: string; answer_text: string; points: number; is_correct: boolean }[];
}) {
  const sessionId = crypto.randomUUID();
  let totalScore = 0;
  let maxPoints = session.total_points ?? session.total_questions;
  const stmts: { sql: string; values?: any[] }[] = [];

  stmts.push({
    sql: `INSERT INTO quiz_sessions
          (session_id, stb_id, chapter_id, section_id, session_type, total_questions, time_spent_seconds, overall_score, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    values: [sessionId, session.stb_id ?? null, session.chapter_id ?? null,
             session.section_id ?? null, session.session_type ?? 'practice',
             session.total_questions, session.time_spent_seconds, 0]
  });

  for (const a of session.answers) {
    totalScore += a.points;
    stmts.push({
      sql: `INSERT INTO quiz_answers (answer_id, quiz_id, session_id, answer_text, points, is_correct)
            VALUES (?, ?, ?, ?, ?, ?)`,
      values: [crypto.randomUUID(), a.quiz_id, sessionId, a.answer_text, a.points, a.is_correct ? 1 : 0]
    });
  }

  await executeBatch(stmts);

  // Update score (use total_points if available, otherwise fall back to question count)
  const percentage = maxPoints > 0 ? Math.min((totalScore / maxPoints) * 100, 100) : 0;
  await executeRun('UPDATE quiz_sessions SET overall_score = ? WHERE session_id = ?',
    [percentage, sessionId]);

  return { sessionId, score: percentage };
}

export async function recordExamSession(session: {
  stb_id?: string;
  chapter_id?: number;
  section_id?: string;
  session_type?: string;
  total_questions: number;
  total_points?: number;
  time_spent_seconds: number;
  answers: { question_id: string; answer_text: string; points: number; is_correct: boolean }[];
}) {
  const sessionId = crypto.randomUUID();
  let totalScore = 0;
  let correctCount = 0;
  const stmts: { sql: string; values?: any[] }[] = [];

  for (const a of session.answers) {
    totalScore += a.points;
    if (a.is_correct) correctCount++;
    stmts.push({
      sql: `INSERT INTO exam_answers (answer_id, question_id, session_id, answer_text, points, is_correct)
            VALUES (?, ?, ?, ?, ?, ?)`,
      values: [crypto.randomUUID(), a.question_id, sessionId, a.answer_text, a.points, a.is_correct ? 1 : 0]
    });
  }

  const maxPoints = session.total_points ?? session.total_questions;
  const percentage = maxPoints > 0 ? Math.min((totalScore / maxPoints) * 100, 100) : 0;
  stmts.unshift({
    sql: `INSERT INTO exam_sessions
          (session_id, stb_id, chapter_id, section_id, session_type, total_questions,
           correct_answers, wrong_answers, overall_score, time_spent_seconds, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    values: [sessionId, session.stb_id ?? null, session.chapter_id ?? null,
             session.section_id ?? null, session.session_type ?? 'practice',
             session.total_questions, correctCount,
             session.total_questions - correctCount, percentage, session.time_spent_seconds]
  });

  await executeBatch(stmts);
  return { sessionId, score: percentage, correct: correctCount };
}

// ============================================================================
// Highlights, bookmarks, notes (user data)
// ============================================================================

export async function addHighlight(highlight: {
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  text_content: string;
  highlight_color?: string;
  note?: string;
}) {
  const id = crypto.randomUUID();
  await executeRun(
    `INSERT INTO highlights (highlight_id, stb_id, chapter_id, section_id, page_number, text_content, highlight_color, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, highlight.stb_id, highlight.chapter_id, highlight.section_id,
     highlight.page_number ?? null, highlight.text_content,
     highlight.highlight_color ?? 'yellow', highlight.note ?? null]
  );
  return id;
}

export async function getHighlights(stbId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM highlights WHERE stb_id = ? ORDER BY created_at DESC',
    [stbId]
  );
  return values;
}

export async function addBookmark(bookmark: {
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  bookmark_type?: string;
  note?: string;
}) {
  const id = crypto.randomUUID();
  await executeRun(
    `INSERT INTO bookmarks (bookmark_id, stb_id, chapter_id, section_id, page_number, bookmark_type, note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, bookmark.stb_id, bookmark.chapter_id, bookmark.section_id,
     bookmark.page_number ?? null, bookmark.bookmark_type ?? 'basic', bookmark.note ?? null]
  );
  return id;
}

export async function getBookmarks(stbId: string) {
  const { values } = await executeQuery(
    'SELECT * FROM bookmarks WHERE stb_id = ? ORDER BY created_at DESC',
    [stbId]
  );
  return values;
}

export async function addStudyNote(note: {
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  note_text: string;
}) {
  const id = crypto.randomUUID();
  await executeRun(
    `INSERT INTO study_notes (note_id, stb_id, chapter_id, section_id, page_number, note_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, note.stb_id, note.chapter_id, note.section_id,
     note.page_number ?? null, note.note_text]
  );
  return id;
}

export async function getStudyNotes(stbId: string, chapterId?: number) {
  let sql = 'SELECT * FROM study_notes WHERE stb_id = ?';
  const params: any[] = [stbId];
  if (chapterId !== undefined) {
    sql += ' AND chapter_id = ?';
    params.push(chapterId);
  }
  sql += ' ORDER BY created_at DESC';
  const { values } = await executeQuery(sql, params);
  return values;
}

export async function deleteStudyNote(noteId: string) {
  await executeRun('DELETE FROM study_notes WHERE note_id = ?', [noteId]);
}

// ============================================================================
// Content versioning (for in-app updates)
// ============================================================================

export async function getContentManifest() {
  const { values } = await executeQuery('SELECT * FROM content_manifest');
  return values;
}

export async function updateContentManifest(contentType: string, contentId: string, version: number, checksum: string) {
  await executeRun(
    `INSERT OR REPLACE INTO content_manifest (content_type, content_id, version, checksum, downloaded_at)
     VALUES (?, ?, ?, ?, datetime('now'))`,
    [contentType, contentId, version, checksum]
  );
}

// Initialize on module load for web testing
let initPromise: Promise<void> | null = null;
export async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initOfflineDb();
  }
  await initPromise;
}
