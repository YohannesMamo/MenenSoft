"""
MERP Student Assistant - SQLite Import Script
Reads exported JSON content and creates a SQLite database.
"""
import os
import sys
import json
import sqlite3
from pathlib import Path

SCHEMA_FILE = Path(__file__).parent.parent / "schema" / "001_offline_schema.sql"
CONTENT_DIR = Path(__file__).parent.parent / "content"


def create_db(db_path, schema_file=SCHEMA_FILE):
    """Create SQLite database from schema."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")

    with open(schema_file, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()
    print(f"  Database created: {db_path}")
    return conn


def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def import_grades(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('INSERT OR REPLACE INTO grades (grade_id, grade_desc) VALUES (?, ?)',
                    (r['grade_id'], r['grade_desc']))
    conn.commit()
    print(f"    grades: {len(data)}")


def import_subjects(conn, data):
    cur = conn.cursor()
    for r in data:
        if r.get('category_id'):
            cur.execute('INSERT OR REPLACE INTO subject_categories (category_id, category_desc) VALUES (?, ?)',
                        (r['category_id'], r['category_desc']))
        cur.execute('INSERT OR REPLACE INTO subjects (subject_id, subject_desc, category_id) VALUES (?, ?, ?)',
                    (r['subject_id'], r['subject_desc'], r.get('category_id')))
    conn.commit()
    print(f"    subjects: {len(data)}")


def import_textbooks(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO textbooks
            (stb_id, title, subject_id, grade_id, published_year, pdf_filename, chapter_count, section_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['stb_id'], r['title'], r['subject_id'], r['grade_id'],
             r.get('published_year'), r.get('pdf_filename'),
             r.get('chapter_count', 0), r.get('section_count', 0)))
    conn.commit()
    print(f"    textbooks: {len(data)}")


def import_chapters(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO textbook_chapters
            (record_id, stb_id, chapter_id, chapter_title, start_page, end_page)
            VALUES (?, ?, ?, ?, ?, ?)''',
            (r['record_id'], r['stb_id'], r['chapter_id'],
             r['chapter_title'], r['start_page'], r['end_page']))
    conn.commit()
    print(f"    chapters: {len(data)}")


def import_sections(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO textbook_sections
            (record_id, section_id, section_title, stb_id, chapter_id,
             section_content, start_page, end_page)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['record_id'], r['section_id'], r['section_title'],
             r['stb_id'], r['chapter_id'], r.get('section_content'),
             r.get('start_page'), r.get('end_page')))
    conn.commit()
    print(f"    sections: {len(data)}")


def import_section_content(conn, content_dir, stb_ids_file):
    """Import section content from per-textbook JSON files."""
    stb_content_map = load_json(stb_ids_file)
    cur = conn.cursor()
    count = 0
    for stb_id, filename in stb_content_map.items():
        filepath = content_dir / filename
        if not filepath.exists():
            continue
        content_map = load_json(filepath)
        for key, content in content_map.items():
            # key format: "{stb_id}-{chapter_id}-{section_id}" where stb_id has dashes (e.g. GR12-AGR)
            # Use rsplit to correctly handle stb_ids with dashes
            parts = key.rsplit('-', 2)
            if len(parts) != 3:
                continue
            s_id, ch_id, sec_id = parts
            cur.execute('''UPDATE textbook_sections
                SET section_content = ?
                WHERE stb_id = ? AND chapter_id = ? AND section_id = ?''',
                (content, s_id, int(ch_id), sec_id))
            count += 1
    conn.commit()
    print(f"    section content: {count} sections updated")


def import_basic_notes(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO basic_notes
            (record_id, stb_id, chapter_id, section_id, sub_section,
             notes, summary, keywords, solved_examples)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['record_id'], r['stb_id'], r['chapter_id'], r['section_id'],
             r['sub_section'], r.get('notes'), r.get('summary'),
             r.get('keywords'), r.get('solved_examples')))
    conn.commit()
    print(f"    basic_notes: {len(data)}")


def import_presentations(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO presentations
            (slide_id, stb_id, chapter_id, section_id, slide_number,
             slide_title, basic_presentation, advanced_presentation,
             ai_presentation, notes, duration_seconds, has_quiz)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['slide_id'], r['stb_id'], r['chapter_id'], r['section_id'],
             r['slide_number'], r.get('slide_title'),
             r.get('basic_presentation'), r.get('advanced_presentation'),
             r.get('ai_presentation'), r.get('notes'),
             r.get('duration_seconds'), 1 if r.get('has_quiz') else 0))
    conn.commit()
    print(f"    presentations: {len(data)}")


def import_quiz_types(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('INSERT OR REPLACE INTO quiz_types (quiz_type_id, quiz_type_desc) VALUES (?, ?)',
                    (r['quiz_type_id'], r['quiz_type_desc']))
    conn.commit()
    print(f"    quiz_types: {len(data)}")


def import_question_types(conn, data):
    cur = conn.cursor()
    for r in data:
        cur.execute('INSERT OR REPLACE INTO question_types (question_type_id, question_type_desc) VALUES (?, ?)',
                    (r['question_type_id'], r['question_type_desc']))
    conn.commit()
    print(f"    question_types: {len(data)}")


def import_quizzes(conn, data):
    cur = conn.cursor()
    opt_count = 0
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO quizzes
            (quiz_id, quiz_type_id, stb_id, quiz_text, explanation, points,
             difficulty, chapter_id, section_id, subject_id,
             time_limit_minutes, allow_retake)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['quiz_id'], r['quiz_type_id'], r['stb_id'], r['quiz_text'],
             r.get('explanation'), r['points'], r.get('difficulty'),
             r.get('chapter_id'), r.get('section_id'), r.get('subject_id'),
             r.get('time_limit_minutes'), 1 if r.get('allow_retake', True) else 0))
        for o in r.get('options', []):
            cur.execute('''INSERT OR REPLACE INTO quiz_options
                (record_id, quiz_id, option_label, option_text, explanation, is_correct, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (o['record_id'], o['quiz_id'], o['option_label'], o['option_text'],
                 o.get('explanation'), 1 if o.get('is_correct') else 0,
                 o.get('display_order', 0)))
            opt_count += 1
    conn.commit()
    print(f"    quizzes: {len(data)}, options: {opt_count}")


def import_exam_questions(conn, data):
    cur = conn.cursor()
    opt_count = 0
    for r in data:
        cur.execute('''INSERT OR REPLACE INTO exam_questions
            (question_id, question_type_id, stb_id, section_id, question_text,
             explanation, points, difficulty, chapter_id,
             learning_objective, cognitive_level, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['question_id'], r['question_type_id'], r['stb_id'],
             r.get('section_id'), r['question_text'], r.get('explanation'),
             r['points'], r.get('difficulty'), r.get('chapter_id'),
             r.get('learning_objective'), r.get('cognitive_level'), r.get('status')))
        for o in r.get('options', []):
            cur.execute('''INSERT OR REPLACE INTO exam_question_options
                (record_id, question_id, option_label, option_text, explanation, is_correct, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (o['record_id'], o['question_id'], o['option_label'], o['option_text'],
                 o.get('explanation'), 1 if o.get('is_correct') else 0,
                 o.get('display_order', 0)))
            opt_count += 1
    conn.commit()
    print(f"    exam_questions: {len(data)}, options: {opt_count}")


def import_eslce(conn, data):
    cur = conn.cursor()

    for r in data.get('subjects', []):
        cur.execute('INSERT OR REPLACE INTO eslce_subjects (id, name, code, merp_subject_id) VALUES (?, ?, ?, ?)',
                    (r['id'], r['name'], r['code'], r['merp_subject_id']))

    for r in data.get('question_types', []):
        cur.execute('INSERT OR REPLACE INTO eslce_question_types (id, name, code, merp_type_id) VALUES (?, ?, ?, ?)',
                    (r['id'], r['name'], r['code'], r['merp_type_id']))

    for r in data.get('questions', []):
        cur.execute('''INSERT OR REPLACE INTO eslce_questions
            (id, subject_id, question_type_id, code, question_text,
             marks, difficulty, explanation, source_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['id'], r['subject_id'], r['question_type_id'], r['code'],
             r['question_text'], r['marks'], r.get('difficulty'),
             r.get('explanation'), r.get('source_type', 'bank')))
        for o in r.get('options', []):
            cur.execute('''INSERT OR REPLACE INTO eslce_question_options
                (id, question_id, label, option_text, is_correct, explanation, display_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (o['id'], o['question_id'], o['label'], o['option_text'],
                 1 if o['is_correct'] else 0, o.get('explanation'), o['display_order']))

    for r in data.get('exams', []):
        cur.execute('''INSERT OR REPLACE INTO eslce_exams
            (id, subject_id, year, semester, type, title, total_questions,
             total_marks, duration_minutes, exam_type)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['id'], r['subject_id'], r['year'], r['semester'],
             r.get('type', 'National'), r.get('title'),
             r['total_questions'], r['total_marks'],
             r.get('duration_minutes'), r.get('exam_type', 'past')))

    for r in data.get('exam_questions', []):
        cur.execute('''INSERT OR REPLACE INTO eslce_exam_questions
            (id, exam_id, question_id, question_number, marks_allocated)
            VALUES (?, ?, ?, ?, ?)''',
            (r['id'], r['exam_id'], r['question_id'],
             r['question_number'], r['marks_allocated']))

    for r in data.get('passages', []):
        cur.execute('''INSERT OR REPLACE INTO eslce_passages
            (id, subject_id, passage_code, title, passage_content,
             word_count, source, exam_year, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (r['id'], r['subject_id'], r['passage_code'], r.get('title'),
             r['passage_content'], r.get('word_count'), r.get('source'),
             r.get('exam_year'), r.get('display_order')))

    for r in data.get('question_passages', []):
        cur.execute('''INSERT OR REPLACE INTO eslce_question_passages
            (id, question_id, passage_id, reference_text, paragraph_number,
             line_start, line_end)
            VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (r['id'], r['question_id'], r['passage_id'],
             r.get('reference_text'), r.get('paragraph_number'),
             r.get('line_start'), r.get('line_end')))

    conn.commit()
    print(f"    eslce_subjects: {len(data.get('subjects', []))}")
    print(f"    eslce_questions: {len(data.get('questions', []))}")
    print(f"    eslce_exams: {len(data.get('exams', []))}")
    print(f"    eslce_passages: {len(data.get('passages', []))}")


def import_grade_to_sqlite(grade_id, db_path=None):
    """Import exported grade data into SQLite."""
    content_dir = CONTENT_DIR / grade_id

    if not content_dir.exists():
        print(f"  ERROR: Content directory not found: {content_dir}")
        print(f"  Run export_content.py first.")
        return None

    if db_path is None:
        db_path = content_dir / f"menen_offline_{grade_id}.db"

    print(f"\n{'='*60}")
    print(f"  IMPORTING TO SQLITE: {grade_id}")
    print(f"{'='*60}")

    conn = create_db(db_path)

    print(f"\n  Loading data...")
    import_grades(conn, load_json(content_dir / 'grades.json'))
    import_subjects(conn, load_json(content_dir / 'subjects.json'))
    import_textbooks(conn, load_json(content_dir / 'textbooks.json'))
    import_chapters(conn, load_json(content_dir / 'chapters.json'))
    import_sections(conn, load_json(content_dir / 'sections.json'))
    import_section_content(conn, content_dir / 'content', content_dir / 'content_files.json')
    import_basic_notes(conn, load_json(content_dir / 'basic_notes.json'))
    import_presentations(conn, load_json(content_dir / 'presentations.json'))
    import_quiz_types(conn, load_json(content_dir / 'quiz_types.json'))
    import_question_types(conn, load_json(content_dir / 'question_types.json'))
    import_quizzes(conn, load_json(content_dir / 'quizzes.json'))
    import_exam_questions(conn, load_json(content_dir / 'exam_questions.json'))
    import_eslce(conn, load_json(content_dir / 'eslce.json'))

    # Get final stats
    cur = conn.cursor()
    tables = [
        'grades', 'subjects', 'textbooks', 'textbook_chapters', 'textbook_sections',
        'basic_notes', 'presentations', 'quizzes', 'quiz_options',
        'exam_questions', 'exam_question_options',
        'eslce_questions', 'eslce_question_options', 'eslce_exams'
    ]
    print(f"\n  Final row counts:")
    total = 0
    for table in tables:
        cur.execute(f'SELECT COUNT(*) FROM {table}')
        count = cur.fetchone()[0]
        total += count
        print(f"    {table}: {count:,}")
    print(f"    TOTAL: {total:,} rows")

    db_size = Path(db_path).stat().st_size
    print(f"\n  Database: {db_path}")
    print(f"  Size: {db_size:,} bytes ({db_size/1024/1024:.1f} MB)")

    conn.close()
    return db_path


if __name__ == '__main__':
    grade = sys.argv[1] if len(sys.argv) > 1 else 'HIG12A'
    import_grade_to_sqlite(grade)
