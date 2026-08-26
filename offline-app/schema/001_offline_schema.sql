-- ============================================================================
-- MERP Student Assistant - Offline App SQLite Schema
-- ============================================================================
-- Design: Single-user offline-first. Content bundled per grade.
-- Tables split into: CONTENT (bundled, read-only) and USER (local, read-write)
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SECTION 1: LOOKUP / REFERENCE TABLES (bundled content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS grades (
    grade_id        TEXT PRIMARY KEY,           -- e.g. 'HIG12A'
    grade_desc      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subject_categories (
    category_id     TEXT PRIMARY KEY,
    category_desc   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    subject_id      TEXT PRIMARY KEY,
    subject_desc    TEXT,
    category_id     TEXT,
    FOREIGN KEY (category_id) REFERENCES subject_categories(category_id)
);

CREATE TABLE IF NOT EXISTS quiz_types (
    quiz_type_id    TEXT PRIMARY KEY,
    quiz_type_desc  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS question_types (
    question_type_id TEXT PRIMARY KEY,
    question_type_desc TEXT NOT NULL
);

-- ============================================================================
-- SECTION 2: TEXTBOOK / CONTENT TABLES (bundled per grade)
-- ============================================================================

CREATE TABLE IF NOT EXISTS textbooks (
    stb_id          TEXT PRIMARY KEY,           -- e.g. 'HIG12A00001'
    title           TEXT NOT NULL,
    subject_id      TEXT NOT NULL,
    grade_id        TEXT NOT NULL,
    published_year  INTEGER,
    pdf_filename    TEXT,                       -- local filename in assets
    chapter_count   INTEGER DEFAULT 0,
    section_count   INTEGER DEFAULT 0,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (grade_id) REFERENCES grades(grade_id)
);

CREATE TABLE IF NOT EXISTS textbook_chapters (
    record_id       TEXT PRIMARY KEY,           -- UUID as text
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    chapter_title   TEXT NOT NULL,
    start_page      INTEGER NOT NULL,
    end_page        INTEGER NOT NULL,
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    UNIQUE(stb_id, chapter_id)
);

CREATE TABLE IF NOT EXISTS textbook_sections (
    record_id       TEXT PRIMARY KEY,           -- UUID as text
    section_id      TEXT NOT NULL,              -- e.g. 'S1.1'
    section_title   TEXT NOT NULL,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_content TEXT,                       -- extracted text content
    start_page      INTEGER,
    end_page        INTEGER,
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    FOREIGN KEY (stb_id, chapter_id) REFERENCES textbook_chapters(stb_id, chapter_id),
    UNIQUE(stb_id, chapter_id, section_id)
);

CREATE TABLE IF NOT EXISTS basic_notes (
    record_id       TEXT PRIMARY KEY,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    sub_section     TEXT NOT NULL,
    notes           TEXT,
    summary         TEXT,
    keywords        TEXT,
    solved_examples TEXT,
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    UNIQUE(stb_id, chapter_id, section_id, sub_section)
);

CREATE TABLE IF NOT EXISTS presentations (
    slide_id        TEXT PRIMARY KEY,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    slide_number    INTEGER NOT NULL,
    slide_title     TEXT,
    basic_presentation TEXT,
    advanced_presentation TEXT,
    ai_presentation TEXT,
    notes           TEXT,
    duration_seconds INTEGER,
    has_quiz        INTEGER DEFAULT 0,          -- boolean
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    UNIQUE(stb_id, chapter_id, section_id, slide_number)
);

-- ============================================================================
-- SECTION 3: QUIZ / QUESTION TABLES (bundled content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id         TEXT PRIMARY KEY,
    quiz_type_id    TEXT NOT NULL,
    stb_id          TEXT NOT NULL,
    quiz_text       TEXT NOT NULL,
    explanation     TEXT,
    points          REAL NOT NULL,
    difficulty      TEXT,
    chapter_id      INTEGER,
    section_id      TEXT,
    subject_id      TEXT,
    time_limit_minutes INTEGER,
    allow_retake    INTEGER DEFAULT 1,
    FOREIGN KEY (quiz_type_id) REFERENCES quiz_types(quiz_type_id),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

CREATE TABLE IF NOT EXISTS quiz_options (
    record_id       TEXT PRIMARY KEY,
    quiz_id         TEXT NOT NULL,
    option_label    TEXT NOT NULL,
    option_text     TEXT NOT NULL,
    explanation     TEXT,
    is_correct      INTEGER DEFAULT 0,          -- boolean
    display_order   INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

CREATE TABLE IF NOT EXISTS exam_questions (
    question_id     TEXT PRIMARY KEY,
    question_type_id TEXT NOT NULL,
    stb_id          TEXT NOT NULL,
    section_id      TEXT,
    question_text   TEXT NOT NULL,
    explanation     TEXT,
    points          REAL NOT NULL,
    difficulty      TEXT,
    chapter_id      INTEGER,
    learning_objective TEXT,
    cognitive_level TEXT,
    status          TEXT,
    FOREIGN KEY (question_type_id) REFERENCES question_types(question_type_id),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

CREATE TABLE IF NOT EXISTS exam_question_options (
    record_id       TEXT PRIMARY KEY,
    question_id     TEXT NOT NULL,
    option_label    TEXT NOT NULL,
    option_text     TEXT NOT NULL,
    explanation     TEXT,
    is_correct      INTEGER DEFAULT 0,
    display_order   INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES exam_questions(question_id)
);

-- ============================================================================
-- SECTION 4: ESLCE TABLES (bundled content, shared across grades)
-- ============================================================================

CREATE TABLE IF NOT EXISTS eslce_subjects (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    code            TEXT NOT NULL UNIQUE,
    merp_subject_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eslce_question_types (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    code            TEXT NOT NULL UNIQUE,
    merp_type_id    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS eslce_questions (
    id              INTEGER PRIMARY KEY,
    subject_id      INTEGER NOT NULL,
    question_type_id INTEGER NOT NULL,
    code            TEXT NOT NULL UNIQUE,
    question_text   TEXT NOT NULL,
    marks           REAL NOT NULL DEFAULT 1.0,
    difficulty      TEXT,
    explanation     TEXT,
    source_type     TEXT DEFAULT 'bank',
    FOREIGN KEY (subject_id) REFERENCES eslce_subjects(id),
    FOREIGN KEY (question_type_id) REFERENCES eslce_question_types(id)
);

CREATE TABLE IF NOT EXISTS eslce_question_options (
    id              INTEGER PRIMARY KEY,
    question_id     INTEGER NOT NULL,
    label           TEXT NOT NULL,
    option_text     TEXT NOT NULL,
    is_correct      INTEGER NOT NULL DEFAULT 0,
    explanation     TEXT,
    display_order   INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES eslce_questions(id)
);

CREATE TABLE IF NOT EXISTS eslce_exams (
    id              INTEGER PRIMARY KEY,
    subject_id      INTEGER NOT NULL,
    year            INTEGER NOT NULL,
    semester        TEXT NOT NULL,
    type            TEXT NOT NULL DEFAULT 'National',
    title           TEXT,
    total_questions INTEGER NOT NULL DEFAULT 0,
    total_marks     REAL NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    exam_type       TEXT NOT NULL DEFAULT 'past',
    FOREIGN KEY (subject_id) REFERENCES eslce_subjects(id)
);

CREATE TABLE IF NOT EXISTS eslce_exam_questions (
    id              INTEGER PRIMARY KEY,
    exam_id         INTEGER NOT NULL,
    question_id     INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    marks_allocated REAL NOT NULL DEFAULT 1.0,
    FOREIGN KEY (exam_id) REFERENCES eslce_exams(id),
    FOREIGN KEY (question_id) REFERENCES eslce_questions(id)
);

CREATE TABLE IF NOT EXISTS eslce_passages (
    id              INTEGER PRIMARY KEY,
    subject_id      INTEGER NOT NULL,
    passage_code    TEXT NOT NULL,
    title           TEXT,
    passage_content TEXT NOT NULL,
    word_count      INTEGER,
    source          TEXT,
    exam_year       INTEGER,
    display_order   INTEGER,
    FOREIGN KEY (subject_id) REFERENCES eslce_subjects(id)
);

CREATE TABLE IF NOT EXISTS eslce_question_passages (
    id              INTEGER PRIMARY KEY,
    question_id     INTEGER NOT NULL,
    passage_id      INTEGER NOT NULL,
    reference_text  TEXT,
    paragraph_number INTEGER,
    line_start      INTEGER,
    line_end        INTEGER,
    FOREIGN KEY (question_id) REFERENCES eslce_questions(id),
    FOREIGN KEY (passage_id) REFERENCES eslce_passages(id),
    UNIQUE(question_id, passage_id)
);

CREATE TABLE IF NOT EXISTS eslce_question_images (
    id              INTEGER PRIMARY KEY,
    question_id     INTEGER NOT NULL,
    image_path      TEXT NOT NULL,              -- local path in assets
    image_description TEXT,
    display_order   INTEGER DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES eslce_questions(id)
);

-- ============================================================================
-- SECTION 5: USER TABLES (local, single-user)
-- ============================================================================

CREATE TABLE IF NOT EXISTS local_user (
    user_id         TEXT PRIMARY KEY,
    display_name    TEXT NOT NULL,
    grade_id        TEXT NOT NULL,
    pin_hash        TEXT,                       -- simple PIN for local auth
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grade_id) REFERENCES grades(grade_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    key             TEXT PRIMARY KEY,
    value           TEXT NOT NULL,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- SECTION 6: STUDY PROGRESS TABLES (user-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS study_sessions (
    session_id      TEXT PRIMARY KEY,           -- generated locally
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at        TEXT,
    pages_covered   TEXT,
    student_notes   TEXT,
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

CREATE TABLE IF NOT EXISTS section_progress (
    record_id       TEXT PRIMARY KEY,           -- generated locally
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    is_completed    INTEGER DEFAULT 0,
    last_accessed   TEXT,
    time_spent_seconds INTEGER DEFAULT 0,
    quiz_attempts   INTEGER DEFAULT 0,
    last_quiz_date  TEXT,
    quiz_completed  INTEGER DEFAULT 0,
    quiz_score      REAL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id),
    UNIQUE(stb_id, chapter_id, section_id)
);

-- ============================================================================
-- SECTION 7: QUIZ SESSION TABLES (user-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS quiz_sessions (
    session_id      TEXT PRIMARY KEY,           -- UUID generated locally
    stb_id          TEXT,
    chapter_id      INTEGER,
    section_id      TEXT,
    session_type    TEXT,                       -- 'practice', 'quiz', etc.
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    overall_score   REAL,
    ended_at        TEXT,
    attempt_number  INTEGER DEFAULT 1,
    quiz_type       TEXT,
    total_questions INTEGER NOT NULL,
    time_spent_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_answers (
    answer_id       TEXT PRIMARY KEY,
    quiz_id         TEXT NOT NULL,
    session_id      TEXT NOT NULL,
    answer_text     TEXT NOT NULL,
    points          REAL NOT NULL,
    answered_at     TEXT DEFAULT (datetime('now')),
    is_correct      INTEGER DEFAULT 0,
    question_order  INTEGER,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id),
    FOREIGN KEY (session_id) REFERENCES quiz_sessions(session_id)
);

-- ============================================================================
-- SECTION 8: EXAM SESSION TABLES (user-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS exam_sessions (
    session_id      TEXT PRIMARY KEY,
    stb_id          TEXT,
    chapter_id      INTEGER,
    section_id      TEXT,
    session_type    TEXT,
    started_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    overall_score   REAL,
    ended_at        TEXT,
    total_questions INTEGER,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers   INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    attempt_number  INTEGER DEFAULT 1,
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

CREATE TABLE IF NOT EXISTS exam_session_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT NOT NULL,
    question_id     TEXT NOT NULL,
    answered        INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES exam_sessions(session_id),
    FOREIGN KEY (question_id) REFERENCES exam_questions(question_id)
);

CREATE TABLE IF NOT EXISTS exam_answers (
    answer_id       TEXT PRIMARY KEY,
    question_id     TEXT NOT NULL,
    answer_text     TEXT NOT NULL,
    points          REAL NOT NULL,
    answered_at     TEXT DEFAULT (datetime('now')),
    session_id      TEXT NOT NULL,
    response_time_seconds INTEGER DEFAULT 0,
    is_correct      INTEGER DEFAULT 0,
    attempt_order   INTEGER,
    FOREIGN KEY (question_id) REFERENCES exam_questions(question_id),
    FOREIGN KEY (session_id) REFERENCES exam_sessions(session_id)
);

-- ============================================================================
-- SECTION 9: ESLCE SESSION TABLES (user-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS eslce_student_sessions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key     TEXT NOT NULL UNIQUE,
    subject_name    TEXT,
    exam_id         INTEGER,
    exam_type       TEXT NOT NULL DEFAULT 'past',
    mode            TEXT NOT NULL DEFAULT 'exam',
    source_year     INTEGER,
    title           TEXT,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_count   INTEGER NOT NULL DEFAULT 0,
    wrong_count     INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    percentage      REAL,
    time_spent_ms   INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    FOREIGN KEY (exam_id) REFERENCES eslce_exams(id)
);

CREATE TABLE IF NOT EXISTS eslce_student_responses (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      INTEGER NOT NULL,
    question_id     INTEGER NOT NULL,
    selected_option_id INTEGER,
    is_correct      INTEGER,
    verdict         TEXT NOT NULL DEFAULT 'unanswered',
    response_time_ms INTEGER,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES eslce_student_sessions(id),
    FOREIGN KEY (question_id) REFERENCES eslce_questions(id),
    FOREIGN KEY (selected_option_id) REFERENCES eslce_question_options(id)
);

-- ============================================================================
-- SECTION 10: HIGHLIGHTS, BOOKMARKS, NOTES (user-generated)
-- ============================================================================

CREATE TABLE IF NOT EXISTS highlights (
    highlight_id    TEXT PRIMARY KEY,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    page_number     INTEGER,
    text_content    TEXT NOT NULL,
    highlight_color TEXT NOT NULL DEFAULT 'yellow',
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    bookmark_id     TEXT PRIMARY KEY,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    page_number     INTEGER,
    bookmark_type   TEXT NOT NULL DEFAULT 'basic',
    note            TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

CREATE TABLE IF NOT EXISTS study_notes (
    note_id         TEXT PRIMARY KEY,
    stb_id          TEXT NOT NULL,
    chapter_id      INTEGER NOT NULL,
    section_id      TEXT NOT NULL,
    page_number     INTEGER,
    note_text       TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (stb_id) REFERENCES textbooks(stb_id)
);

-- ============================================================================
-- SECTION 11: CONTENT VERSIONING (for in-app updates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_manifest (
    content_type    TEXT NOT NULL,              -- 'textbook', 'quiz', 'eslce', 'notes'
    content_id      TEXT NOT NULL,              -- stb_id or 'eslce_all'
    version         INTEGER NOT NULL DEFAULT 1,
    checksum        TEXT,                       -- MD5 of content bundle
    downloaded_at   TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (content_type, content_id)
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

-- Content lookup indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_grade ON textbooks(grade_id);
CREATE INDEX IF NOT EXISTS idx_textbooks_subject ON textbooks(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_stb ON textbook_chapters(stb_id);
CREATE INDEX IF NOT EXISTS idx_sections_stb ON textbook_sections(stb_id);
CREATE INDEX IF NOT EXISTS idx_sections_chapter ON textbook_sections(stb_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_basic_notes_stb ON basic_notes(stb_id);
CREATE INDEX IF NOT EXISTS idx_presentations_stb ON presentations(stb_id);

-- Question lookup indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_stb ON quizzes(stb_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_chapter ON quizzes(stb_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_section ON quizzes(stb_id, chapter_id, section_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_quiz ON quiz_options(quiz_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_stb ON exam_questions(stb_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_chapter ON exam_questions(stb_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_exam_question_options_q ON exam_question_options(question_id);

-- ESLCE indexes
CREATE INDEX IF NOT EXISTS idx_eslce_questions_subject ON eslce_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_question_options_q ON eslce_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_eslce_exams_subject ON eslce_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_exam_questions_exam ON eslce_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_eslce_passages_subject ON eslce_passages(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_question_passages_q ON eslce_question_passages(question_id);

-- User data indexes
CREATE INDEX IF NOT EXISTS idx_section_progress_stb ON section_progress(stb_id);
CREATE INDEX IF NOT EXISTS idx_section_progress_completed ON section_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_stb ON quiz_sessions(stb_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_stb ON exam_sessions(stb_id);
CREATE INDEX IF NOT EXISTS idx_highlights_stb ON highlights(stb_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_stb ON bookmarks(stb_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_stb ON study_notes(stb_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_chapter ON study_notes(stb_id, chapter_id);
