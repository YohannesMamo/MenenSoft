/**
 * Content Loader
 * Handles loading bundled SQLite database into the Capacitor SQLite store.
 * On first launch, copies the pre-built .db file from assets to SQLite.
 */
import { getDb, executeQuery, ensureInitialized } from './offlineDb';

interface ContentManifest {
  grade_id: string;
  exported_at: string;
  textbooks: number;
  chapters: number;
  sections: number;
  quizzes: number;
  exam_questions: number;
  eslce_questions: number;
  eslce_exams: number;
}

/**
 * Check if content has been loaded into the local database.
 */
export async function isContentLoaded(): Promise<boolean> {
  try {
    await ensureInitialized();
    const { values } = await executeQuery('SELECT COUNT(*) as count FROM textbooks');
    return (values[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Get the content manifest from the bundled database.
 */
export async function getContentInfo(): Promise<ContentManifest | null> {
  try {
    await ensureInitialized();
    const { values } = await executeQuery('SELECT * FROM content_manifest LIMIT 1');
    return values[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Load bundled JSON content files into the SQLite database.
 * This is for web/testing mode where we can't bundle a .db file directly.
 * In production Android, the .db file is pre-loaded into assets.
 */
export async function loadBundledJsonContent(gradeId: string): Promise<void> {
  await ensureInitialized();

  const basePath = `/content/${gradeId}`;

  try {
    // Load each JSON file
    const files = [
      'grades', 'subjects', 'textbooks', 'chapters', 'sections',
      'basic_notes', 'presentations', 'quiz_types', 'question_types',
      'quizzes', 'exam_questions', 'eslce'
    ];

    for (const file of files) {
      const resp = await fetch(`${basePath}/${file}.json`);
      if (!resp.ok) continue;
      const data = await resp.json();
      await importJsonTable(file, data);
    }

    // Load section content files
    const contentFilesResp = await fetch(`${basePath}/content_files.json`);
    if (contentFilesResp.ok) {
      const contentFiles = await contentFilesResp.json();
      for (const [_stbId, filename] of Object.entries(contentFiles)) {
        const resp = await fetch(`${basePath}/content/${filename}`);
        if (!resp.ok) continue;
        const contentMap = await resp.json();
        for (const [key, content] of Object.entries(contentMap)) {
          // key format: "{stb_id}-{chapter_id}-{section_id}" where stb_id has dashes (e.g. GR12-AGR)
          const lastDash = (key as string).lastIndexOf('-');
          const secondLastDash = (key as string).lastIndexOf('-', lastDash - 1);
          if (lastDash > 0 && secondLastDash > 0) {
            const sId = (key as string).substring(0, secondLastDash);
            const chId = (key as string).substring(secondLastDash + 1, lastDash);
            const secId = (key as string).substring(lastDash + 1);
            await executeQuery(
              'UPDATE textbook_sections SET section_content = ? WHERE stb_id = ? AND chapter_id = ? AND section_id = ?',
              [content, sId, parseInt(chId), secId]
            );
          }
        }
      }
    }

    console.log(`Content loaded for grade ${gradeId}`);
  } catch (error) {
    console.error('Failed to load bundled content:', error);
    throw error;
  }
}

async function importJsonTable(tableName: string, data: any): Promise<void> {
  if (!data) return;
  if (tableName !== 'eslce' && Array.isArray(data) && data.length === 0) return;

  const conn = getDb();

  switch (tableName) {
    case 'grades':
      for (const r of data) {
        await conn.run(
          'INSERT OR REPLACE INTO grades (grade_id, grade_desc) VALUES (?, ?)',
          [r.grade_id, r.grade_desc]
        );
      }
      break;

    case 'subjects':
      for (const r of data) {
        if (r.category_id) {
          await conn.run(
            'INSERT OR REPLACE INTO subject_categories (category_id, category_desc) VALUES (?, ?)',
            [r.category_id, r.category_desc]
          );
        }
        await conn.run(
          'INSERT OR REPLACE INTO subjects (subject_id, subject_desc, category_id) VALUES (?, ?, ?)',
          [r.subject_id, r.subject_desc, r.category_id ?? null]
        );
      }
      break;

    case 'textbooks':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO textbooks (stb_id, title, subject_id, grade_id, published_year, pdf_filename, chapter_count, section_count)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.stb_id, r.title, r.subject_id, r.grade_id, r.published_year,
           r.pdf_filename ?? null, r.chapter_count ?? 0, r.section_count ?? 0]
        );
      }
      break;

    case 'chapters':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO textbook_chapters (record_id, stb_id, chapter_id, chapter_title, start_page, end_page)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [r.record_id, r.stb_id, r.chapter_id, r.chapter_title, r.start_page, r.end_page]
        );
      }
      break;

    case 'sections':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO textbook_sections (record_id, section_id, section_title, stb_id, chapter_id, start_page, end_page)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [r.record_id, r.section_id, r.section_title, r.stb_id, r.chapter_id,
           r.start_page ?? null, r.end_page ?? null]
        );
      }
      break;

    case 'basic_notes':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO basic_notes (record_id, stb_id, chapter_id, section_id, sub_section, notes, summary, keywords, solved_examples)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.record_id, r.stb_id, r.chapter_id, r.section_id, r.sub_section,
           r.notes ?? null, r.summary ?? null, r.keywords ?? null, r.solved_examples ?? null]
        );
      }
      break;

    case 'presentations':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO presentations (slide_id, stb_id, chapter_id, section_id, slide_number, slide_title, basic_presentation, advanced_presentation, ai_presentation, notes, duration_seconds, has_quiz)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.slide_id, r.stb_id, r.chapter_id, r.section_id, r.slide_number,
           r.slide_title ?? null, r.basic_presentation ?? null,
           r.advanced_presentation ?? null, r.ai_presentation ?? null,
           r.notes ?? null, r.duration_seconds ?? null, r.has_quiz ? 1 : 0]
        );
      }
      break;

    case 'quiz_types':
      for (const r of data) {
        await conn.run(
          'INSERT OR REPLACE INTO quiz_types (quiz_type_id, quiz_type_desc) VALUES (?, ?)',
          [r.quiz_type_id, r.quiz_type_desc]
        );
      }
      break;

    case 'question_types':
      for (const r of data) {
        await conn.run(
          'INSERT OR REPLACE INTO question_types (question_type_id, question_type_desc) VALUES (?, ?)',
          [r.question_type_id, r.question_type_desc]
        );
      }
      break;

    case 'quizzes':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO quizzes (quiz_id, quiz_type_id, stb_id, quiz_text, explanation, points, difficulty, chapter_id, section_id, subject_id, time_limit_minutes, allow_retake)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.quiz_id, r.quiz_type_id, r.stb_id, r.quiz_text, r.explanation ?? null,
           r.points, r.difficulty ?? null, r.chapter_id ?? null, r.section_id ?? null,
           r.subject_id ?? null, r.time_limit_minutes ?? null, r.allow_retake ? 1 : 0]
        );
        if (r.options) {
          for (const o of r.options) {
            await conn.run(
              `INSERT OR REPLACE INTO quiz_options (record_id, quiz_id, option_label, option_text, explanation, is_correct, display_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [o.record_id, o.quiz_id, o.option_label, o.option_text,
               o.explanation ?? null, o.is_correct ? 1 : 0, o.display_order ?? 0]
            );
          }
        }
      }
      break;

    case 'exam_questions':
      for (const r of data) {
        await conn.run(
          `INSERT OR REPLACE INTO exam_questions (question_id, question_type_id, stb_id, section_id, question_text, explanation, points, difficulty, chapter_id, learning_objective, cognitive_level, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.question_id, r.question_type_id, r.stb_id, r.section_id ?? null,
           r.question_text, r.explanation ?? null, r.points, r.difficulty ?? null,
           r.chapter_id ?? null, r.learning_objective ?? null,
           r.cognitive_level ?? null, r.status ?? null]
        );
        if (r.options) {
          for (const o of r.options) {
            await conn.run(
              `INSERT OR REPLACE INTO exam_question_options (record_id, question_id, option_label, option_text, explanation, is_correct, display_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [o.record_id, o.question_id, o.option_label, o.option_text,
               o.explanation ?? null, o.is_correct ? 1 : 0, o.display_order ?? 0]
            );
          }
        }
      }
      break;

    case 'eslce':
      // ESLCE is a nested object
      for (const s of (data.subjects || [])) {
        await conn.run(
          'INSERT OR REPLACE INTO eslce_subjects (id, name, code, merp_subject_id) VALUES (?, ?, ?, ?)',
          [s.id, s.name, s.code, s.merp_subject_id]
        );
      }
      for (const qt of (data.question_types || [])) {
        await conn.run(
          'INSERT OR REPLACE INTO eslce_question_types (id, name, code, merp_type_id) VALUES (?, ?, ?, ?)',
          [qt.id, qt.name, qt.code, qt.merp_type_id]
        );
      }
      for (const q of (data.questions || [])) {
        await conn.run(
          `INSERT OR REPLACE INTO eslce_questions (id, subject_id, question_type_id, code, question_text, marks, difficulty, explanation, source_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [q.id, q.subject_id, q.question_type_id, q.code, q.question_text,
           q.marks, q.difficulty ?? null, q.explanation ?? null, q.source_type ?? 'bank']
        );
        if (q.options) {
          for (const o of q.options) {
            await conn.run(
              `INSERT OR REPLACE INTO eslce_question_options (id, question_id, label, option_text, is_correct, explanation, display_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [o.id, o.question_id, o.label, o.option_text,
               o.is_correct ? 1 : 0, o.explanation ?? null, o.display_order ?? 0]
            );
          }
        }
      }
      for (const e of (data.exams || [])) {
        await conn.run(
          `INSERT OR REPLACE INTO eslce_exams (id, subject_id, year, semester, type, title, total_questions, total_marks, duration_minutes, exam_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.id, e.subject_id, e.year, e.semester, e.type ?? 'National',
           e.title ?? null, e.total_questions, e.total_marks,
           e.duration_minutes ?? null, e.exam_type ?? 'past']
        );
      }
      for (const eq of (data.exam_questions || [])) {
        await conn.run(
          `INSERT OR REPLACE INTO eslce_exam_questions (id, exam_id, question_id, question_number, marks_allocated)
           VALUES (?, ?, ?, ?, ?)`,
          [eq.id, eq.exam_id, eq.question_id, eq.question_number, eq.marks_allocated]
        );
      }
      for (const p of (data.passages || [])) {
        await conn.run(
          `INSERT OR REPLACE INTO eslce_passages (id, subject_id, passage_code, title, passage_content, word_count, source, exam_year, display_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.subject_id, p.passage_code, p.title ?? null, p.passage_content,
           p.word_count ?? null, p.source ?? null, p.exam_year ?? null, p.display_order ?? null]
        );
      }
      for (const qp of (data.question_passages || [])) {
        await conn.run(
          `INSERT OR REPLACE INTO eslce_question_passages (id, question_id, passage_id, reference_text, paragraph_number, line_start, line_end)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [qp.id, qp.question_id, qp.passage_id, qp.reference_text ?? null,
           qp.paragraph_number ?? null, qp.line_start ?? null, qp.line_end ?? null]
        );
      }
      break;
  }
}
