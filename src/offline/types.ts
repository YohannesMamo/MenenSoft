/**
 * Menen Student Assistant - SQLite Schema Type Definitions
 * Directly corresponds to the SQLite Schema provided.
 */

export interface AppMetadata {
  grade: string;          // e.g. "G12"
  grade_label: string;    // e.g. "Grade 12"
  content_version: number;
  app_name: string;       // e.g. "Menen G12"
}

export interface Grade {
  grade_id: string;       // e.g. 'HIG12A'
  grade_desc: string;
}

export interface SubjectCategory {
  category_id: string;
  category_desc: string;
}

export interface Subject {
  subject_id: string;
  subject_desc: string;
  category_id: string;
}

export interface QuizType {
  quiz_type_id: string;
  quiz_type_desc: string;
}

export interface QuestionType {
  question_type_id: string;
  question_type_desc: string;
}

export interface Textbook {
  stb_id: string;
  title: string;
  subject_id: string;
  grade_id: string;
  published_year?: number;
  pdf_filename?: string;
  chapter_count: number;
  section_count: number;
}

export interface TextbookChapter {
  record_id: string;
  stb_id: string;
  chapter_id: number;
  chapter_title: string;
  start_page: number;
  end_page: number;
}

export interface TextbookSection {
  record_id: string;
  section_id: string;
  section_title: string;
  stb_id: string;
  chapter_id: number;
  section_content: string;
  start_page?: number;
  end_page?: number;
}

export interface BasicNote {
  record_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  sub_section: string;
  notes?: string;
  summary?: string;
  keywords?: string;
  solved_examples?: string;
}

export interface Presentation {
  slide_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  slide_number: number;
  slide_title?: string;
  basic_presentation?: string;
  advanced_presentation?: string;
  ai_presentation?: string;
  notes?: string;
  duration_seconds?: number;
  has_quiz: number;
}

export interface Quiz {
  quiz_id: string;
  quiz_type_id: string;
  stb_id: string;
  quiz_text: string;
  explanation?: string;
  points: number;
  difficulty?: string;
  chapter_id?: number;
  section_id?: string;
  subject_id?: string;
  time_limit_minutes?: number;
  allow_retake?: number;
}

export interface QuizOption {
  record_id: string;
  quiz_id: string;
  option_label: string;
  option_text: string;
  explanation?: string;
  is_correct: number;
  display_order: number;
}

export interface ExamQuestion {
  question_id: string;
  question_type_id: string;
  stb_id: string;
  section_id?: string;
  question_text: string;
  explanation?: string;
  points: number;
  difficulty?: string;
  chapter_id?: number;
  learning_objective?: string;
  cognitive_level?: string;
  status?: string;
}

export interface ExamQuestionOption {
  record_id: string;
  question_id: string;
  option_label: string;
  option_text: string;
  explanation?: string;
  is_correct: number;
  display_order: number;
}

// ESLCE Tables
export interface EslceSubject {
  id: number;
  name: string;
  code: string;
  merp_subject_id: string;
}

export interface EslceQuestionType {
  id: number;
  name: string;
  code: string;
  merp_type_id: string;
}

export interface EslceQuestion {
  id: number;
  subject_id: number;
  question_type_id: number;
  code: string;
  question_text: string;
  marks: number;
  difficulty?: string;
  explanation?: string;
  source_type?: string;
}

export interface EslceQuestionOption {
  id: number;
  question_id: number;
  label: string;
  option_text: string;
  is_correct: number;
  explanation?: string;
  display_order: number;
}

export interface EslceExam {
  id: number;
  subject_id: number;
  year: number;
  semester: string;
  type: string;
  title?: string;
  total_questions: number;
  total_marks: number;
  duration_minutes?: number;
  exam_type: string;
  virtual?: boolean;
}

export interface EslceExamQuestion {
  id: number;
  exam_id: number;
  question_id: number;
  question_number: number;
  marks_allocated: number;
}

export interface EslcePassage {
  id: number;
  subject_id: number;
  passage_code: string;
  title?: string;
  passage_content: string;
  word_count?: number;
  source?: string;
  exam_year?: number;
  display_order?: number;
}

export interface EslceQuestionPassage {
  id: number;
  question_id: number;
  passage_id: number;
  reference_text?: string;
  paragraph_number?: number;
  line_start?: number;
  line_end?: number;
}

// User Tables
export interface LocalUser {
  user_id: string;
  display_name: string;
  grade_id: string;
  pin_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface StudySession {
  session_id: string;
  stb_id: string;
  chapter_id: number;
  started_at: string;
  ended_at?: string;
  pages_covered?: string;
  student_notes?: string;
}

export interface SectionProgress {
  record_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  is_completed: number;
  last_accessed?: string;
  time_spent_seconds: number;
  quiz_attempts: number;
  last_quiz_date?: string;
  quiz_completed: number;
  quiz_score?: number;
  re_read_count?: number;
  created_at: string;
}

export interface QuizSession {
  session_id: string;
  stb_id?: string;
  chapter_id?: number;
  section_id?: string;
  session_type?: string;
  started_at: string;
  completed_at?: string;
  overall_score?: number;
  ended_at?: string;
  attempt_number: number;
  quiz_type?: string;
  total_questions: number;
  time_spent_seconds: number;
}

export interface QuizAnswer {
  answer_id: string;
  quiz_id: string;
  session_id: string;
  answer_text: string;
  points: number;
  answered_at: string;
  is_correct: number;
  question_order?: number;
}

export interface ExamSession {
  session_id: string;
  stb_id?: string;
  chapter_id?: number;
  section_id?: string;
  session_type?: string;
  started_at: string;
  completed_at?: string;
  overall_score?: number;
  ended_at?: string;
  total_questions?: number;
  correct_answers: number;
  wrong_answers: number;
  time_spent_seconds: number;
  attempt_number: number;
}

export interface ExamAnswer {
  answer_id: string;
  question_id: string;
  answer_text: string;
  points: number;
  answered_at: string;
  session_id: string;
  response_time_seconds: number;
  is_correct: number;
  attempt_order?: number;
}

export interface EslceStudentSession {
  id: number;
  session_key: string;
  subject_name?: string;
  exam_id?: number;
  exam_type: string;
  mode: string;
  source_year?: number;
  title?: string;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  percentage?: number;
  time_spent_ms?: number;
  created_at: string;
  completed_at?: string;
}

export interface EslceStudentResponse {
  id: number;
  session_id: number;
  question_id: number;
  selected_option_id?: number;
  is_correct?: number;
  verdict: string;
  response_time_ms?: number;
  created_at: string;
}

export interface Highlight {
  highlight_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  text_content: string;
  highlight_color: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  bookmark_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  bookmark_type: string;
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface StudyNote {
  note_id: string;
  stb_id: string;
  chapter_id: number;
  section_id: string;
  page_number?: number;
  note_text: string;
  created_at: string;
  updated_at: string;
}

export interface StudyActivityLog {
  activity_id: string;
  activity_date: string;     // YYYY-MM-DD
  activity_type: 'read_section' | 'quiz_session' | 'exam_session' | 'eslce_session' | 'study_note' | 'highlight' | 'manual_checkin';
  title: string;
  details?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string; // YYYY-MM-DD
  total_days_studied: number;
  freeze_credits?: number;
  updated_at: string;
}

export interface StreakDayStatus {
  date: string;           // YYYY-MM-DD
  dayName: string;        // 'Mon', 'Tue', etc.
  dayNumber: number;      // 1-31
  hasStudied: boolean;
  isToday: boolean;
  isFuture: boolean;
}

// --- EVALUATION LAYER TYPES ---

export interface QuestionHistoryItem {
  history_id: string;
  question_id: string;
  assessment_type: 'quiz' | 'exam' | 'eslce';
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  was_correct: number;       // 0 or 1
  time_spent_ms: number;
  answered_at: string;
  stb_id?: string;
  chapter_id?: number;
  section_id?: string;
  subject_name?: string;
  explanation?: string;
}

export interface SectionBreakdownItem {
  section_id: string;
  section_title: string;
  total_questions: number;
  correct_count: number;
  percentage: number;
  is_weak: boolean;          // < 60%
}

export interface EslceSubjectPrediction {
  subject_id: number;
  subject_name: string;
  raw_score: number;
  total_marks: number;
  accuracy_percentage: number;
  estimated_scaled_score: number; // (raw / total) * 700
  passed: boolean;                 // 350 / 700 threshold
  time_per_question_sec: number;
  passage_accuracy_percentage?: number;
}

export interface EslcePredictionRecord {
  prediction_id: string;
  computed_at: string;
  student_grade: string;
  subject_breakdown: EslceSubjectPrediction[];
  total_estimated_score: number;
  average_scaled_score: number;
  overall_predicted_status: 'PASS' | 'FAIL';
  year_over_year_trend: {
    year: number;
    estimated_scaled: number;
    percentage: number;
  }[];
}

export interface WeakSectionItem {
  section_id: string;
  section_title: string;
  stb_id: string;
  chapter_id: number;
  average_score: number;
  attempts: number;
  last_attempted_at?: string;
}

export interface ScopeEvaluationSummary {
  scope_type: 'textbook' | 'chapter' | 'subject' | 'overall';
  scope_id: string;
  title: string;
  total_assessments: number;
  average_score: number;
  best_score: number;
  latest_score: number;
  passed_count: number;
  failed_count: number;
  weak_sections: WeakSectionItem[];
  strong_sections: {
    section_id: string;
    section_title: string;
    average_score: number;
  }[];
  weakest_subject?: string;
  strongest_subject?: string;
  grade_level_percentile?: number;
  last_evaluated_at: string;
}

export interface TextbookStudyEvaluation {
  stb_id: string;
  title: string;
  subject_id: string;
  total_sections: number;
  completed_sections: number;
  completion_percentage: number;
  total_time_spent_seconds: number;
  avg_time_per_section_seconds: number;
  highlights_count: number;
  bookmarks_count: number;
  notes_count: number;
  re_reads_count: number;
}

export interface SubjectMasteryItem {
  subject_id: string;
  subject_name: string;
  category: 'NAT_SCI' | 'GEN_LANG' | 'SOC_SCI';
  average_score: number;
  assessments_count: number;
  pass_status: 'PASS' | 'NEEDS_REVISION';
  color: string;
  iconName?: string;
  textbook_progress_percent: number;
  recommended_focus?: string;
}
