-- ESLCE Integration Tables for MERP_OSHS
-- Created: 2026-08-18
-- Purpose: Hold ESLCE exam data (past + predicted) in MERP_OSHS
-- Run: psql -U postgres -d MERP_OSHS -f create_eslce_tables.sql

BEGIN;

-- Subject mapping: ESLCE subject IDs → MERP SubjectsInfo.SubjectID
CREATE TABLE IF NOT EXISTS eslce_subjects (
    id              SMALLINT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    code            VARCHAR(10) NOT NULL UNIQUE,
    merp_subject_id VARCHAR(10) NOT NULL
);

-- Question type mapping: ESLCE type IDs → MERP QuestionTypes.QuestionTypeID
CREATE TABLE IF NOT EXISTS eslce_question_types (
    id              SMALLINT PRIMARY KEY,
    name            VARCHAR(30) NOT NULL UNIQUE,
    code            CHAR(5) NOT NULL UNIQUE,
    merp_type_id    VARCHAR(10) NOT NULL
);

-- Questions (mirrors ESLCE questions table exactly)
CREATE TABLE IF NOT EXISTS eslce_questions (
    id                  SERIAL PRIMARY KEY,
    subject_id          SMALLINT NOT NULL REFERENCES eslce_subjects(id),
    question_type_id    SMALLINT NOT NULL REFERENCES eslce_question_types(id),
    code                VARCHAR(20) NOT NULL UNIQUE,
    text                TEXT NOT NULL,
    marks               NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    difficulty          VARCHAR(20),
    explanation         TEXT,
    source_type         VARCHAR(20) DEFAULT 'bank',
    is_active           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Question options (mirrors ESLCE question_options)
CREATE TABLE IF NOT EXISTS eslce_question_options (
    id              SERIAL PRIMARY KEY,
    question_id     INTEGER NOT NULL REFERENCES eslce_questions(id) ON DELETE CASCADE,
    label           CHAR(1) NOT NULL,
    text            TEXT NOT NULL,
    is_correct      BOOLEAN NOT NULL DEFAULT false,
    explanation     TEXT,
    display_order   SMALLINT NOT NULL,
    UNIQUE (question_id, label)
);

-- Exams (past + predicted metadata)
CREATE TABLE IF NOT EXISTS eslce_exams (
    id                  SERIAL PRIMARY KEY,
    subject_id          SMALLINT NOT NULL REFERENCES eslce_subjects(id),
    year                SMALLINT NOT NULL,
    semester            VARCHAR(20) NOT NULL,
    type                VARCHAR(20) NOT NULL DEFAULT 'National',
    title               VARCHAR(200),
    total_questions     SMALLINT NOT NULL DEFAULT 0,
    total_marks         NUMERIC(5,2) NOT NULL DEFAULT 0,
    duration_minutes    SMALLINT,
    exam_type           VARCHAR(20) NOT NULL DEFAULT 'past',
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Exam ↔ Question linking
CREATE TABLE IF NOT EXISTS eslce_exam_questions (
    id                  SERIAL PRIMARY KEY,
    exam_id             INTEGER NOT NULL REFERENCES eslce_exams(id) ON DELETE CASCADE,
    question_id         INTEGER NOT NULL REFERENCES eslce_questions(id),
    question_number     SMALLINT NOT NULL,
    marks_allocated     NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    UNIQUE (exam_id, question_id),
    UNIQUE (exam_id, question_number)
);

-- ESLCE student sessions (separate from MERP ExamSessions)
CREATE TABLE IF NOT EXISTS eslce_student_sessions (
    id                  SERIAL PRIMARY KEY,
    session_key         VARCHAR(64) NOT NULL UNIQUE,
    student_id          VARCHAR(10) NOT NULL,
    subject_name        VARCHAR(100),
    exam_id             INTEGER REFERENCES eslce_exams(id),
    exam_type           VARCHAR(20) NOT NULL DEFAULT 'past',
    mode                VARCHAR(20) NOT NULL DEFAULT 'exam',
    source_year         INTEGER,
    title               VARCHAR(255),
    total_questions     INTEGER NOT NULL DEFAULT 0,
    correct_count       INTEGER NOT NULL DEFAULT 0,
    wrong_count         INTEGER NOT NULL DEFAULT 0,
    unanswered_count    INTEGER NOT NULL DEFAULT 0,
    percentage          NUMERIC,
    time_spent_ms       INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ
);

-- ESLCE student responses
CREATE TABLE IF NOT EXISTS eslce_student_responses (
    id                  SERIAL PRIMARY KEY,
    session_id          INTEGER NOT NULL REFERENCES eslce_student_sessions(id) ON DELETE CASCADE,
    question_id         INTEGER NOT NULL,
    selected_option_id  INTEGER,
    is_correct          BOOLEAN,
    verdict             VARCHAR(20) NOT NULL DEFAULT 'unanswered',
    response_time_ms    INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reading-comprehension passages (e.g. English exam passages)
CREATE TABLE IF NOT EXISTS eslce_passages (
    id                  SERIAL PRIMARY KEY,
    subject_id          SMALLINT NOT NULL REFERENCES eslce_subjects(id),
    passage_code        VARCHAR(50) NOT NULL,
    title               VARCHAR(200),
    content             TEXT NOT NULL,
    word_count          INTEGER,
    source              TEXT,
    exam_year           SMALLINT,
    display_order       INTEGER,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Exam questions that reference a passage (many questions can share a passage)
CREATE TABLE IF NOT EXISTS eslce_question_passages (
    id                  SERIAL PRIMARY KEY,
    question_id         INTEGER NOT NULL REFERENCES eslce_questions(id) ON DELETE CASCADE,
    passage_id          INTEGER NOT NULL REFERENCES eslce_passages(id) ON DELETE CASCADE,
    reference_text      VARCHAR(255),
    paragraph_number    INTEGER,
    line_start          INTEGER,
    line_end            INTEGER,
    UNIQUE (question_id, passage_id)
);

-- Figures / images attached to a question
CREATE TABLE IF NOT EXISTS eslce_question_images (
    id                  SERIAL PRIMARY KEY,
    question_id         INTEGER NOT NULL REFERENCES eslce_questions(id) ON DELETE CASCADE,
    image_path          TEXT NOT NULL,
    image_description   TEXT,
    display_order       SMALLINT DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eslce_q_subject ON eslce_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_q_type ON eslce_questions(question_type_id);
CREATE INDEX IF NOT EXISTS idx_eslce_q_source ON eslce_questions(source_type);
CREATE INDEX IF NOT EXISTS idx_eslce_opt_question ON eslce_question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_eslce_exam_subject ON eslce_exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_exam_year ON eslce_exams(year);
CREATE INDEX IF NOT EXISTS idx_eslce_exam_type ON eslce_exams(exam_type);
CREATE INDEX IF NOT EXISTS idx_eslce_eq_exam ON eslce_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_eslce_eq_question ON eslce_exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_eslce_ss_student ON eslce_student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_eslce_ss_exam ON eslce_student_sessions(exam_id);
CREATE INDEX IF NOT EXISTS idx_eslce_sr_session ON eslce_student_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_eslce_p_subject ON eslce_passages(subject_id);
CREATE INDEX IF NOT EXISTS idx_eslce_qp_question ON eslce_question_passages(question_id);
CREATE INDEX IF NOT EXISTS idx_eslce_qp_passage ON eslce_question_passages(passage_id);
CREATE INDEX IF NOT EXISTS idx_eslce_qi_question ON eslce_question_images(question_id);

COMMIT;
