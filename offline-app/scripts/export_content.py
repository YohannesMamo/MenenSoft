"""
MERP Student Assistant - Content Export Scripts
Connects to the PostgreSQL backend and exports content per grade for offline use.
"""
import os
import sys
import json
import hashlib
import psycopg2
import psycopg2.extras
from datetime import datetime
from pathlib import Path

# Database connection (uses local dev DB by default)
DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
    "database": os.environ.get("DB_NAME", "MERP_OSHS"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "GenghisKhan@1200"),
}

# Output directory
CONTENT_DIR = Path(__file__).parent.parent / "content"


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


def export_grades():
    """Export all grades."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT "GradeID" as grade_id, "GradeDescription" as grade_desc FROM "GradesInfo"')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_subjects():
    """Export all subjects with categories."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT s."SubjectID" as subject_id, s."SubjectDescription" as subject_desc,
               c."SubCategoryID" as category_id, c."SubCategoryDescription" as category_desc
        FROM "SubjectsInfo" s
        LEFT JOIN "SUbjectCategory" c ON s."SubCategoryID" = c."SubCategoryID"
    ''')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_textbooks(grade_id):
    """Export textbooks for a specific grade."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "STBID" as stb_id, "STBTitle" as title, "STBSubjectID" as subject_id,
               "STBGradeID" as grade_id, "STBPublishedYear" as published_year,
               "STBUrl" as pdf_url, "STBSize" as size, "STBFormat" as format,
               "ChapterCount" as chapter_count, "SectionCount" as section_count
        FROM "STextBooks"
        WHERE "STBGradeID" = %s
    ''', (grade_id,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_chapters(stb_ids):
    """Export chapters for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "RecordID"::text as record_id, "STBID" as stb_id,
               "STBChapterID" as chapter_id, "STBChapterTitle" as chapter_title,
               "STBChapterStartPage" as start_page, "STBChapterEndPage" as end_page
        FROM "STBChapters"
        WHERE "STBID" = ANY(%s)
        ORDER BY "STBID", "STBChapterID"
    ''', (stb_ids,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_sections(stb_ids):
    """Export sections for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "RecordID"::text as record_id, "STBSectionID" as section_id,
               "STBSectionTitle" as section_title, "STBID" as stb_id,
               "STBChapterID" as chapter_id, "STBSectionContent" as section_content,
               "STBSectionStartPage" as start_page, "STBSectionEndPage" as end_page
        FROM "STBSections"
        WHERE "STBID" = ANY(%s)
        ORDER BY "STBID", "STBChapterID", "STBSectionID"
    ''', (stb_ids,))
    rows = []
    for r in cur.fetchall():
        d = dict(r)
        # Don't include massive content in JSON export; it goes to separate files
        d['has_content'] = d['section_content'] is not None and len(d['section_content'] or '') > 0
        d['content_length'] = len(d['section_content'] or '')
        d['section_content'] = None  # stripped; export separately
        rows.append(d)
    cur.close()
    conn.close()
    return rows


def export_section_content(stb_id, chapter_id, section_id):
    """Export full section content."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "STBSectionContent" as content
        FROM "STBSections"
        WHERE "STBID" = %s AND "STBChapterID" = %s AND "STBSectionID" = %s
    ''', (stb_id, chapter_id, section_id))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row['content'] if row else None


def export_all_section_content(stb_ids):
    """Export all section content for given textbooks. Returns dict keyed by stbId-chapterId-sectionId."""
    if not stb_ids:
        return {}
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "STBID" as stb_id, "STBChapterID" as chapter_id,
               "STBSectionID" as section_id, "STBSectionContent" as content
        FROM "STBSections"
        WHERE "STBID" = ANY(%s)
    ''', (stb_ids,))
    content_map = {}
    for r in cur.fetchall():
        key = f"{r['stb_id']}-{r['chapter_id']}-{r['section_id']}"
        content_map[key] = r['content']
    cur.close()
    conn.close()
    return content_map


def export_basic_notes(stb_ids):
    """Export basic notes for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "RecordID"::text as record_id, "STBID" as stb_id,
               "STBChapterID" as chapter_id, "STBSectionID" as section_id,
               "STBSubSection" as sub_section, "STBNotes" as notes,
               "STBSummary" as summary, "STBKeywords" as keywords,
               "STBSolvEx" as solved_examples
        FROM "STBBasicNotes"
        WHERE "STBID" = ANY(%s)
        ORDER BY "STBID", "STBChapterID", "STBSectionID"
    ''', (stb_ids,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_presentations(stb_ids):
    """Export presentations for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "SlideID"::text as slide_id, "STBID" as stb_id,
               "STBChapterID" as chapter_id, "STBSectionID" as section_id,
               "SlideNumber" as slide_number, "SlideTitle" as slide_title,
               "STBBasicPresentation" as basic_presentation,
               "STBAdvancedPresentation" as advanced_presentation,
               "STBAIPresentations" as ai_presentation,
               "Notes" as notes, "DurationSeconds" as duration_seconds,
               "HasQuiz" as has_quiz
        FROM "STBPresentations"
        WHERE "STBID" = ANY(%s)
        ORDER BY "STBID", "STBChapterID", "STBSectionID", "SlideNumber"
    ''', (stb_ids,))
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_quiz_types():
    """Export quiz types."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT "QuizTypeID" as quiz_type_id, "QuizTypeDescription" as quiz_type_desc FROM "QuizType"')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def export_question_types():
    """Export question types. Falls back to distinct values from Questions if table is empty."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('SELECT "QuestionTypeID" as question_type_id, "QuestionTypeDescription" as question_type_desc FROM "QuestionType"')
    rows = [dict(r) for r in cur.fetchall()]

    if not rows:
        # Table is empty; extract from actual data
        cur.execute('SELECT DISTINCT "QTypeID" as question_type_id FROM "Questions"')
        for r in cur.fetchall():
            rows.append({'question_type_id': r['question_type_id'], 'question_type_desc': r['question_type_id']})

        # Also add from ESLCE question types mapping
        cur.execute('SELECT DISTINCT merp_type_id as question_type_id FROM eslce_question_types')
        seen = {r['question_type_id'] for r in rows}
        for r in cur.fetchall():
            if r['question_type_id'] and r['question_type_id'] not in seen:
                rows.append({'question_type_id': r['question_type_id'], 'question_type_desc': r['question_type_id']})

    cur.close()
    conn.close()
    return rows


def export_quizzes(stb_ids):
    """Export quiz questions for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "QuizID" as quiz_id, "QuizTypeID" as quiz_type_id,
               "QzSTBID" as stb_id, "QzText" as quiz_text,
               "QzExplanation" as explanation, "QzPoints" as points,
               "QzDifficulty" as difficulty, "QzChapterID" as chapter_id,
               "QzSectionID" as section_id, "TimeLimitMinutes" as time_limit_minutes,
               "AllowRetake" as allow_retake, "QzSubjectID" as subject_id
        FROM "Quizzes"
        WHERE "QzSTBID" = ANY(%s)
    ''', (stb_ids,))
    quizzes = [dict(r) for r in cur.fetchall()]

    if quizzes:
        quiz_ids = [q['quiz_id'] for q in quizzes]
        cur.execute('''
            SELECT "RecordID"::text as record_id, "QuizID" as quiz_id,
                   "OptionLabel" as option_label, "OptionText" as option_text,
                   "QzOpExplanation" as explanation, "IsCorrect" as is_correct,
                   "DisplayOrder" as display_order
            FROM "QuizOptions"
            WHERE "QuizID" = ANY(%s)
            ORDER BY "QuizID", "DisplayOrder"
        ''', (quiz_ids,))
        options = [dict(r) for r in cur.fetchall()]

        # Attach options to quizzes
        opts_by_quiz = {}
        for o in options:
            opts_by_quiz.setdefault(o['quiz_id'], []).append(o)
        for q in quizzes:
            q['options'] = opts_by_quiz.get(q['quiz_id'], [])

    cur.close()
    conn.close()
    return quizzes


def export_exam_questions(stb_ids):
    """Export exam questions for given textbook IDs."""
    if not stb_ids:
        return []
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute('''
        SELECT "QuestionID" as question_id, "QTypeID" as question_type_id,
               "QSTBID" as stb_id, "QSectionID" as section_id,
               "QText" as question_text, "QExplanation" as explanation,
               "QPoints" as points, "QDifficulty" as difficulty,
               "QChapterID" as chapter_id, "QLearningObjective" as learning_objective,
               "QCognitiveLevel" as cognitive_level, "QStatus" as status
        FROM "Questions"
        WHERE "QSTBID" = ANY(%s)
    ''', (stb_ids,))
    questions = [dict(r) for r in cur.fetchall()]

    if questions:
        q_ids = [q['question_id'] for q in questions]
        cur.execute('''
            SELECT "RecordID"::text as record_id, "QuestionID" as question_id,
                   "OptionLabel" as option_label, "OptionText" as option_text,
                   "OpExplanation" as explanation, "IsCorrect" as is_correct,
                   "DisplayOrder" as display_order
            FROM "QuestionOptions"
            WHERE "QuestionID" = ANY(%s)
            ORDER BY "QuestionID", "DisplayOrder"
        ''', (q_ids,))
        options = [dict(r) for r in cur.fetchall()]

        opts_by_q = {}
        for o in options:
            opts_by_q.setdefault(o['question_id'], []).append(o)
        for q in questions:
            q['options'] = opts_by_q.get(q['question_id'], [])

    cur.close()
    conn.close()
    return questions


def export_eslce_data():
    """Export all ESLCE data (shared across grades)."""
    conn = get_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Subjects
    cur.execute('SELECT id, name, code, merp_subject_id FROM eslce_subjects')
    subjects = [dict(r) for r in cur.fetchall()]

    # Question types
    cur.execute('SELECT id, name, code, merp_type_id FROM eslce_question_types')
    qtypes = [dict(r) for r in cur.fetchall()]

    # Questions
    cur.execute('SELECT id, subject_id, question_type_id, code, text as question_text, marks, difficulty, explanation, source_type FROM eslce_questions WHERE is_active = true')
    questions = [dict(r) for r in cur.fetchall()]

    # Options
    if questions:
        q_ids = [q['id'] for q in questions]
        cur.execute('SELECT id, question_id, label, text as option_text, is_correct, explanation, display_order FROM eslce_question_options WHERE question_id = ANY(%s)', (q_ids,))
        all_options = [dict(r) for r in cur.fetchall()]
        opts_by_q = {}
        for o in all_options:
            opts_by_q.setdefault(o['question_id'], []).append(o)
        for q in questions:
            q['options'] = opts_by_q.get(q['id'], [])

    # Exams
    cur.execute('SELECT id, subject_id, year, semester, type, title, total_questions, total_marks, duration_minutes, exam_type FROM eslce_exams')
    exams = [dict(r) for r in cur.fetchall()]

    # Exam-question links
    if exams:
        exam_ids = [e['id'] for e in exams]
        cur.execute('SELECT id, exam_id, question_id, question_number, marks_allocated FROM eslce_exam_questions WHERE exam_id = ANY(%s)', (exam_ids,))
        eq_links = [dict(r) for r in cur.fetchall()]

    # Passages
    cur.execute('SELECT id, subject_id, passage_code, title, content as passage_content, word_count, source, exam_year, display_order FROM eslce_passages')
    passages = [dict(r) for r in cur.fetchall()]

    # Question-passage links
    if passages:
        p_ids = [p['id'] for p in passages]
        cur.execute('SELECT id, question_id, passage_id, reference_text, paragraph_number, line_start, line_end FROM eslce_question_passages WHERE passage_id = ANY(%s)', (p_ids,))
        qp_links = [dict(r) for r in cur.fetchall()]

    cur.close()
    conn.close()

    return {
        'subjects': subjects,
        'question_types': qtypes,
        'questions': questions,
        'exams': exams,
        'passages': passages,
        'exam_questions': eq_links if exams else [],
        'question_passages': qp_links if passages else [],
    }


def export_grade_data(grade_id, output_dir=None):
    """
    Export all content for a specific grade.
    Creates a content bundle directory with JSON files.
    """
    if output_dir is None:
        output_dir = CONTENT_DIR / grade_id
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*60}")
    print(f"  EXPORTING GRADE: {grade_id}")
    print(f"{'='*60}")

    # 1. Grades
    grades = export_grades()
    print(f"  Grades: {len(grades)}")

    # 2. Subjects
    subjects = export_subjects()
    print(f"  Subjects: {len(subjects)}")

    # 3. Textbooks
    textbooks = export_textbooks(grade_id)
    stb_ids = [t['stb_id'] for t in textbooks]
    print(f"  Textbooks: {len(textbooks)}")

    # 4. Chapters
    chapters = export_chapters(stb_ids)
    print(f"  Chapters: {len(chapters)}")

    # 5. Sections (metadata only)
    sections = export_sections(stb_ids)
    print(f"  Sections: {len(sections)}")

    # 6. Section content (exported to separate files per textbook)
    print(f"  Exporting section content...")
    content_map = export_all_section_content(stb_ids)
    total_content_size = sum(len(v or '') for v in content_map.values())
    print(f"  Section content: {len(content_map)} sections, {total_content_size:,} chars")

    # 7. Basic notes
    notes = export_basic_notes(stb_ids)
    print(f"  Basic notes: {len(notes)}")

    # 8. Presentations
    presentations = export_presentations(stb_ids)
    print(f"  Presentations: {len(presentations)}")

    # 9. Quiz types + question types
    quiz_types = export_quiz_types()
    question_types = export_question_types()
    print(f"  Quiz types: {len(quiz_types)}, Question types: {len(question_types)}")

    # 10. Quizzes
    quizzes = export_quizzes(stb_ids)
    print(f"  Quizzes: {len(quizzes)}")

    # 11. Exam questions
    exam_questions = export_exam_questions(stb_ids)
    print(f"  Exam questions: {len(exam_questions)}")

    # 12. ESLCE (shared)
    eslce = export_eslce_data()
    print(f"  ESLCE subjects: {len(eslce['subjects'])}")
    print(f"  ESLCE questions: {len(eslce['questions'])}")
    print(f"  ESLCE exams: {len(eslce['exams'])}")
    print(f"  ESLCE passages: {len(eslce['passages'])}")

    # Save JSON files
    print(f"\n  Writing files to {output_dir}...")

    def save_json(filename, data):
        filepath = output_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        size = filepath.stat().st_size
        print(f"    {filename}: {size:,} bytes")
        return size

    total_size = 0
    total_size += save_json('grades.json', grades)
    total_size += save_json('subjects.json', subjects)
    total_size += save_json('textbooks.json', textbooks)
    total_size += save_json('chapters.json', chapters)
    total_size += save_json('sections.json', sections)
    total_size += save_json('basic_notes.json', notes)
    total_size += save_json('presentations.json', presentations)
    total_size += save_json('quiz_types.json', quiz_types)
    total_size += save_json('question_types.json', question_types)
    total_size += save_json('quizzes.json', quizzes)
    total_size += save_json('exam_questions.json', exam_questions)
    total_size += save_json('eslce.json', eslce)

    # Save section content as separate files per textbook (they can be large)
    content_dir = output_dir / "content"
    content_dir.mkdir(exist_ok=True)
    content_files = {}
    for stb_id in stb_ids:
        stb_content = {k: v for k, v in content_map.items() if k.startswith(stb_id + '-')}
        if stb_content:
            filepath = content_dir / f"{stb_id}.json"
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(stb_content, f, ensure_ascii=False, indent=2, default=str)
            size = filepath.stat().st_size
            total_size += size
            content_files[stb_id] = filepath.name
            print(f"    content/{stb_id}.json: {size:,} bytes")

    save_json('content_files.json', content_files)

    # Generate content manifest
    manifest = {
        'grade_id': grade_id,
        'exported_at': datetime.now().isoformat(),
        'total_size_bytes': total_size,
        'textbooks': len(textbooks),
        'chapters': len(chapters),
        'sections': len(sections),
        'quizzes': len(quizzes),
        'exam_questions': len(exam_questions),
        'eslce_questions': len(eslce['questions']),
        'eslce_exams': len(eslce['exams']),
        'content_checksum': hashlib.md5(json.dumps({'stb_ids': stb_ids}, sort_keys=True).encode()).hexdigest()[:12],
    }
    save_json('manifest.json', manifest)

    print(f"\n  TOTAL EXPORT SIZE: {total_size:,} bytes ({total_size/1024/1024:.1f} MB)")
    print(f"  Output: {output_dir}")
    return output_dir


if __name__ == '__main__':
    grade = sys.argv[1] if len(sys.argv) > 1 else 'HIG12A'
    export_grade_data(grade)
