"""
Migrate ESLCE data → MERP_OSHS.
Reads from ESLCE database, writes into eslce_* tables in MERP_OSHS.
Run: python migrate_eslce_to_merp.py [--predicted-only] [--all]
"""
import argparse
import os
import sys
import psycopg2

ESLCE_DSN = os.getenv("ESLCE_DSN", "host=localhost dbname=ESLCE user=postgres password=")
MERP_DSN  = os.getenv("MERP_DSN",  "host=localhost dbname=MERP_OSHS user=postgres password=")

# ESLCE subject_id → MERP SubjectsInfo.SubjectID
SUBJECT_MAP = {
    1: "ENGLISH",
    2: "AMHAR",
    3: "MATH",
    4: "PHYSIC",
    5: "CHEMIS",
    6: "BIOLOGY",
    7: "HISTOR",
    8: "GEOGR",
    9: "CIVICS",
    10: "ECONO",
    100: "HEALTH",
    101: "INFOTECH",
    102: "AGRISC",
    103: "CIVICS",    # closest match
    104: "MATH",       # SAT → Math (aptitude test)
}

# ESLCE question_type_id → MERP QuestionTypes.QuestionTypeID
TYPE_MAP = {
    1: "MCQ",
    2: "TRUEFALSE",
    3: "FILLBLANK",
    4: "MATCHPAIR",
    5: "SHORTANS",
    6: "ESSAYLONG",
}


def migrate_subjects(eslce, merp):
    """Copy ESLCE subjects into eslce_subjects."""
    cur = eslce.cursor()
    cur.execute("SELECT id, name, code FROM subjects ORDER BY id")
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for sid, name, code in rows:
        merp_id = SUBJECT_MAP.get(sid, "MATH")
        mcur.execute("""
            INSERT INTO eslce_subjects (id, name, code, merp_subject_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, merp_subject_id=EXCLUDED.merp_subject_id
        """, (sid, name, code, merp_id))
        inserted += 1
    merp.commit()
    mcur.close()
    print(f"  Subjects: {inserted} rows")
    return inserted


def migrate_question_types(eslce, merp):
    """Copy ESLCE question types into eslce_question_types."""
    cur = eslce.cursor()
    cur.execute("SELECT id, name, code FROM question_types ORDER BY id")
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for tid, name, code in rows:
        merp_type = TYPE_MAP.get(tid, "MCQ")
        mcur.execute("""
            INSERT INTO eslce_question_types (id, name, code, merp_type_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, merp_type_id=EXCLUDED.merp_type_id
        """, (tid, name, code, merp_type))
        inserted += 1
    merp.commit()
    mcur.close()
    print(f"  Question types: {inserted} rows")
    return inserted


def migrate_questions(eslce, merp, predicted_only=False):
    """Copy questions from ESLCE -> eslce_questions."""
    # Load difficulty_levels lookup
    dcur = eslce.cursor()
    dcur.execute("SELECT id, name FROM difficulty_levels ORDER BY id")
    diff_map = {row[0]: row[1] for row in dcur.fetchall()}
    dcur.close()

    cur = eslce.cursor()
    if predicted_only:
        cur.execute("""
            SELECT q.id, q.subject_id, q.question_type_id, q.difficulty_id,
                   q.code, q.text, q.marks, q.source_type
            FROM questions q WHERE q.source_type='generated' ORDER BY q.id
        """)
    else:
        cur.execute("""
            SELECT q.id, q.subject_id, q.question_type_id, q.difficulty_id,
                   q.code, q.text, q.marks, q.source_type
            FROM questions q ORDER BY q.id
        """)

    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for q in rows:
        qid, subject_id, type_id, diff_id, code, text, marks, source_type = q
        difficulty = diff_map.get(diff_id, "Medium")
        mcur.execute("""
            INSERT INTO eslce_questions (id, subject_id, question_type_id, code, text, marks, difficulty, source_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                text=EXCLUDED.text, marks=EXCLUDED.marks, difficulty=EXCLUDED.difficulty,
                source_type=EXCLUDED.source_type
        """, (qid, subject_id, type_id, code, text, marks, difficulty, source_type))
        inserted += 1

    # Reset sequence
    if inserted > 0:
        mcur.execute("SELECT setval('eslce_questions_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_questions))")

    merp.commit()
    mcur.close()
    print(f"  Questions: {inserted} rows")
    return inserted


def migrate_options(eslce, merp):
    """Copy question options from ESLCE → eslce_question_options."""
    cur = eslce.cursor()
    cur.execute("SELECT id, question_id, label, text, is_correct, explanation, display_order FROM question_options ORDER BY id")
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for opt in rows:
        oid, qid, label, text, is_correct, explanation, display_order = opt
        mcur.execute("""
            INSERT INTO eslce_question_options (id, question_id, label, text, is_correct, explanation, display_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                text=EXCLUDED.text, is_correct=EXCLUDED.is_correct,
                explanation=EXCLUDED.explanation, display_order=EXCLUDED.display_order
        """, (oid, qid, label, text, is_correct, explanation, display_order))
        inserted += 1

    if inserted > 0:
        mcur.execute("SELECT setval('eslce_question_options_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_question_options))")

    merp.commit()
    mcur.close()
    print(f"  Options: {inserted} rows")
    return inserted


def migrate_exams(eslce, merp):
    """Copy exams from ESLCE → eslce_exams."""
    cur = eslce.cursor()
    cur.execute("SELECT id, subject_id, year, semester, type, title, total_questions, total_marks, duration_minutes, exam_type FROM exams ORDER BY id")
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for e in rows:
        eid, subject_id, year, semester, etype, title, total_q, total_m, duration, exam_type = e
        mcur.execute("""
            INSERT INTO eslce_exams (id, subject_id, year, semester, type, title, total_questions, total_marks, duration_minutes, exam_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                subject_id=EXCLUDED.subject_id, year=EXCLUDED.year, semester=EXCLUDED.semester,
                type=EXCLUDED.type, title=EXCLUDED.title, total_questions=EXCLUDED.total_questions,
                total_marks=EXCLUDED.total_marks, exam_type=EXCLUDED.exam_type
        """, (eid, subject_id, year, semester, etype, title, total_q, total_m, duration, exam_type))
        inserted += 1

    if inserted > 0:
        mcur.execute("SELECT setval('eslce_exams_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_exams))")

    merp.commit()
    mcur.close()
    print(f"  Exams: {inserted} rows")
    return inserted


def migrate_exam_questions(eslce, merp):
    """Copy exam-question links from ESLCE → eslce_exam_questions."""
    cur = eslce.cursor()
    cur.execute("SELECT id, exam_id, question_id, question_number, marks_allocated FROM exam_questions ORDER BY id")
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for eq in rows:
        eqid, exam_id, question_id, qnum, marks = eq
        mcur.execute("""
            INSERT INTO eslce_exam_questions (id, exam_id, question_id, question_number, marks_allocated)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                exam_id=EXCLUDED.exam_id, question_id=EXCLUDED.question_id,
                question_number=EXCLUDED.question_number, marks_allocated=EXCLUDED.marks_allocated
        """, (eqid, exam_id, question_id, qnum, marks))
        inserted += 1

    if inserted > 0:
        mcur.execute("SELECT setval('eslce_exam_questions_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_exam_questions))")

    merp.commit()
    mcur.close()
    print(f"  Exam questions: {inserted} rows")
    return inserted


def migrate_passages(eslce, merp):
    """Copy reading-comprehension passages → eslce_passages."""
    cur = eslce.cursor()
    cur.execute("""
        SELECT id, subject_id, passage_code, title, content, word_count, source,
               exam_year, display_order
        FROM passages ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for r in rows:
        (pid, subject_id, passage_code, title, content, word_count, source,
         exam_year, display_order) = r
        mcur.execute("""
            INSERT INTO eslce_passages (id, subject_id, passage_code, title, content,
                                        word_count, source, exam_year, display_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                title=EXCLUDED.title, content=EXCLUDED.content,
                word_count=EXCLUDED.word_count, source=EXCLUDED.source,
                exam_year=EXCLUDED.exam_year, display_order=EXCLUDED.display_order
        """, (pid, subject_id, passage_code, title, content, word_count, source,
              exam_year, display_order))
        inserted += 1

    if inserted > 0:
        mcur.execute("SELECT setval('eslce_passages_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_passages))")

    merp.commit()
    mcur.close()
    print(f"  Passages: {inserted} rows")
    return inserted


def migrate_question_passages(eslce, merp):
    """Copy question↔passage links → eslce_question_passages."""
    cur = eslce.cursor()
    cur.execute("""
        SELECT question_id, passage_id, reference_text, paragraph_number,
               line_start, line_end
        FROM question_passages ORDER BY question_id, passage_id
    """)
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    for qid, pid, ref, para, ls, le in rows:
        mcur.execute("""
            INSERT INTO eslce_question_passages (question_id, passage_id, reference_text,
                                                 paragraph_number, line_start, line_end)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT ON CONSTRAINT eslce_question_passages_question_id_passage_id_key DO UPDATE SET
                reference_text=EXCLUDED.reference_text,
                paragraph_number=EXCLUDED.paragraph_number,
                line_start=EXCLUDED.line_start, line_end=EXCLUDED.line_end
        """, (qid, pid, ref, para, ls, le))
        inserted += 1

    merp.commit()
    mcur.close()
    print(f"  Question-passage links: {inserted} rows")
    return inserted


def migrate_question_images(eslce, merp, image_root=None):
    """
    Copy question figures → eslce_question_images.

    Source image_path is an absolute path on the ESLCE project's disk. Each file
    is copied into MERP's served uploads folder (default: backend/uploads/eslce_images/)
    under a stable name, and the stored path is rewritten to a /files/... URL.
    """
    import shutil
    import os

    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    upload_root = image_root or os.path.join(backend_dir, "uploads", "eslce_images")
    os.makedirs(upload_root, exist_ok=True)

    cur = eslce.cursor()
    cur.execute("""
        SELECT id, question_id, image_path, image_description, display_order
        FROM question_images ORDER BY question_id, display_order, id
    """)
    rows = cur.fetchall()
    cur.close()

    mcur = merp.cursor()
    inserted = 0
    copied = 0
    for img_id, qid, src_path, desc, order in rows:
        if not src_path or not os.path.exists(src_path):
            print(f"    ⚠ skipping missing image id={img_id} qid={qid}: {src_path}")
            continue
        ext = os.path.splitext(src_path)[1].lower() or ".jpg"
        target_name = f"q{qid}_{img_id}{ext}"
        target_path = os.path.join(upload_root, target_name)
        if not os.path.exists(target_path):
            shutil.copyfile(src_path, target_path)
            copied += 1
        url = f"/files/eslce_images/{target_name}"
        mcur.execute("""
            INSERT INTO eslce_question_images (id, question_id, image_path, image_description, display_order)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                image_path=EXCLUDED.image_path,
                image_description=EXCLUDED.image_description,
                display_order=EXCLUDED.display_order
        """, (img_id, qid, url, desc, order))
        inserted += 1

    if inserted > 0:
        mcur.execute("SELECT setval('eslce_question_images_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_question_images))")

    merp.commit()
    mcur.close()
    print(f"  Question images: {inserted} rows ({copied} files copied to {upload_root})")
    return inserted


def verify(eslce, merp):
    """Print summary of both databases."""
    print("\n=== Verification ===")
    tables = [
        ("eslce_subjects", "id"),
        ("eslce_question_types", "id"),
        ("eslce_questions", "id"),
        ("eslce_question_options", "id"),
        ("eslce_exams", "id"),
        ("eslce_exam_questions", "id"),
        ("eslce_passages", "id"),
        ("eslce_question_passages", "id"),
        ("eslce_question_images", "id"),
    ]
    for table, col in tables:
        mcur = merp.cursor()
        mcur.execute(f"SELECT count(*) FROM {table}")
        count = mcur.fetchone()[0]
        mcur.close()
        print(f"  MERP_OSHS {table}: {count}")

    # ESLCE source counts
    mcur = merp.cursor()
    mcur.execute("SELECT source_type, count(*) FROM eslce_questions GROUP BY source_type ORDER BY source_type")
    for st, cnt in mcur.fetchall():
        print(f"    {st}: {cnt}")
    mcur.close()

    mcur = merp.cursor()
    mcur.execute("SELECT exam_type, count(*) FROM eslce_exams GROUP BY exam_type ORDER BY exam_type")
    for et, cnt in mcur.fetchall():
        print(f"    {et}: {cnt}")
    mcur.close()


def main():
    parser = argparse.ArgumentParser(description="Migrate ESLCE data to MERP_OSHS")
    parser.add_argument("--predicted-only", action="store_true", help="Only migrate generated questions")
    parser.add_argument("--skip-questions", action="store_true", help="Skip question/option migration")
    parser.add_argument("--all", action="store_true", help="Migrate everything (default)")
    args = parser.parse_args()

    print("Connecting to databases...")
    eslce = psycopg2.connect(ESLCE_DSN)
    merp = psycopg2.connect(MERP_DSN)

    try:
        print("\nMigrating subjects...")
        migrate_subjects(eslce, merp)

        print("\nMigrating question types...")
        migrate_question_types(eslce, merp)

        if not args.skip_questions:
            print("\nMigrating questions...")
            migrate_questions(eslce, merp, predicted_only=args.predicted_only)

            print("\nMigrating options...")
            migrate_options(eslce, merp)
        else:
            print("\nSkipping questions/options (--skip-questions)")

        print("\nMigrating exams...")
        migrate_exams(eslce, merp)

        print("\nMigrating exam-question links...")
        migrate_exam_questions(eslce, merp)

        print("\nMigrating passages...")
        migrate_passages(eslce, merp)

        print("\nMigrating question-passage links...")
        migrate_question_passages(eslce, merp)

        print("\nMigrating question images...")
        migrate_question_images(eslce, merp)

        verify(eslce, merp)

        print("\n[OK] Migration complete!")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        merp.rollback()
        raise
    finally:
        eslce.close()
        merp.close()


if __name__ == "__main__":
    main()
