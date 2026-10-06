/**
 * Runtime schema migration for the Menen offline database.
 * The bundled menen_offline.db ships the canonical 001_offline_schema.sql content
 * tables plus the core user tables. The evaluation/remediation layer of the
 * integrated Android app needs additional analytics tables.
 *
 * All statements are idempotent and are executed at app startup (MenenOfflineDatabase.init).
 */
import { executeRun, executeQuery, getDb } from '../services/offlineDb';
import { CANONICAL_SCHEMA_STATEMENTS } from './canonicalSchema';

const TABLES: { name: string; sql: string }[] = [
  {
    name: 'app_metadata',
    sql: `CREATE TABLE IF NOT EXISTS app_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      grade TEXT NOT NULL DEFAULT 'G12',
      grade_label TEXT NOT NULL DEFAULT 'Grade 12',
      content_version INTEGER NOT NULL DEFAULT 1,
      app_name TEXT NOT NULL DEFAULT 'Menen Student Assistant',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  },
  {
    name: 'question_history',
    sql: `CREATE TABLE IF NOT EXISTS question_history (
      history_id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      assessment_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      selected_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      was_correct INTEGER NOT NULL DEFAULT 0,
      time_spent_ms INTEGER NOT NULL DEFAULT 0,
      answered_at TEXT NOT NULL DEFAULT (datetime('now')),
      stb_id TEXT,
      chapter_id INTEGER,
      section_id TEXT,
      subject_name TEXT,
      explanation TEXT
    );`
  },
  {
    name: 'study_activity_logs',
    sql: `CREATE TABLE IF NOT EXISTS study_activity_logs (
      activity_id TEXT PRIMARY KEY,
      activity_date TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      details TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  },
  {
    name: 'user_streak',
    sql: `CREATE TABLE IF NOT EXISTS user_streak (
      user_id TEXT PRIMARY KEY,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_activity_date TEXT,
      total_days_studied INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  },
  {
    name: 'evaluation_summaries',
    sql: `CREATE TABLE IF NOT EXISTS evaluation_summaries (
      summary_id TEXT PRIMARY KEY,
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      title TEXT,
      total_assessments INTEGER NOT NULL DEFAULT 0,
      average_score REAL NOT NULL DEFAULT 0,
      best_score REAL NOT NULL DEFAULT 0,
      latest_score REAL NOT NULL DEFAULT 0,
      passed_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      weakest_subject TEXT,
      strongest_subject TEXT,
      grade_level_percentile INTEGER NOT NULL DEFAULT 0,
      weak_sections TEXT,
      strong_sections TEXT,
      last_evaluated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  },
  {
    name: 'eslce_predictions',
    sql: `CREATE TABLE IF NOT EXISTS eslce_predictions (
      prediction_id TEXT PRIMARY KEY,
      computed_at TEXT NOT NULL DEFAULT (datetime('now')),
      student_grade TEXT NOT NULL,
      total_estimated_score REAL NOT NULL DEFAULT 0,
      average_scaled_score REAL NOT NULL DEFAULT 0,
      overall_predicted_status TEXT NOT NULL DEFAULT 'FAIL',
      subject_breakdown TEXT NOT NULL,
      year_over_year_trend TEXT NOT NULL
    );`
  }
];

/**
 * Adds the re_read_count column to section_progress if it does not exist yet.
 * The canonical bundled schema predates this column; the reader UI relies on it
 * for "re-reads" tracking in the study evaluation layer.
 */
async function tableExists(name: string): Promise<boolean> {
  const { values } = await executeQuery<{ n: number }>(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name = ?",
    [name]
  );
  return (values[0]?.n ?? 0) > 0;
}

/**
 * Adds the re_read_count column to section_progress if it does not exist yet.
 * The canonical bundled schema predates this column; the reader UI relies on it
 * for "re-reads" tracking in the study evaluation layer.
 * Safe on a DB that has not imported content yet (creates the base table).
 */
async function ensureReReadCountColumn(): Promise<void> {
  if (!(await tableExists('section_progress'))) {
    await executeRun(`CREATE TABLE IF NOT EXISTS section_progress (
      record_id TEXT PRIMARY KEY,
      stb_id TEXT NOT NULL,
      chapter_id INTEGER NOT NULL,
      section_id TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      last_accessed TEXT,
      re_read_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`);
  }

  const { values } = await executeQuery<{ name: string }>(
    'PRAGMA table_info(section_progress)'
  );
  if (!values.some(c => c.name === 're_read_count')) {
    await executeRun(
      'ALTER TABLE section_progress ADD COLUMN re_read_count INTEGER NOT NULL DEFAULT 0'
    );
  }
}

/**
 * Ensures the reference grades used by local_users exist so that the
 * local_user.grade_id foreign key is satisfiable even if the bundled content
 * omitted some grade rows.
 */
async function ensureGradeRows(): Promise<void> {
  if (!(await tableExists('grades'))) {
    await executeRun('CREATE TABLE IF NOT EXISTS grades (grade_id TEXT PRIMARY KEY, grade_desc TEXT NOT NULL);');
  }
  const grades = [
    ['MID9A', 'Grade 9'],
    ['HIG10A', 'Grade 10'],
    ['HIG11A', 'Grade 11'],
    ['HIG12A', 'Grade 12']
  ];
  for (const [gradeId, gradeDesc] of grades) {
    await executeRun(
      'INSERT OR IGNORE INTO grades (grade_id, grade_desc) VALUES (?, ?)',
      [gradeId, gradeDesc]
    );
  }
}

/**
 * Applies the canonical bundled schema (content + user tables) to a database
 * that lacks it. The bundled menen_offline.db already ships with this schema,
 * so on Android this is a single no-op existence check. On the web fallback
 * (fresh empty DB) it is what makes the JSON content import possible.
 */
async function ensureCanonicalSchema(): Promise<void> {
  if (await tableExists('textbooks')) return;
  console.log('[menen-db] Empty DB detected — applying canonical schema...');
  for (const stmt of CANONICAL_SCHEMA_STATEMENTS) {
    try {
      await executeRun(stmt);
    } catch (e) {
      console.warn('[menen-db] canonical schema statement skipped:', String(stmt).slice(0, 80), e);
    }
  }
}

/**
 * Runs all idempotent schema patches. Safe to call on every app start.
 */
export async function runSchemaPatch(): Promise<void> {
  getDb();
  await ensureCanonicalSchema();
  for (const t of TABLES) {
    await executeRun(t.sql);
  }
  await ensureReReadCountColumn();
  await ensureGradeRows();
}