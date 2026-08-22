"""
Seed ESLCE tables in MERP_OSHS from the existing PascalCase tables.

No separate ESLCE database required — reads directly from MERP_OSHS.
Run: python seed_eslce.py
"""
import os
import sys
import psycopg2

MERP_DSN = os.getenv("MERP_DSN", "host=localhost dbname=MERP_OSHS user=postgres password=")

# ── ESLCE subjects (id, name, code, merp_subject_id) ─────────────────────
SUBJECTS = [
    (1,   "English",      "ENG",  "ENGLISH"),
    (2,   "Amharic",      "AMH",  "AMHAR"),
    (3,   "Mathematics",  "MTH",  "MATH"),
    (4,   "Physics",      "PHY",  "PHYSIC"),
    (5,   "Chemistry",    "CHM",  "CHEMIS"),
    (6,   "Biology",      "BIO",  "BIOLOGY"),
    (7,   "History",      "HIS",  "HISTOR"),
    (8,   "Geography",    "GEO",  "GEOGR"),
    (9,   "Civics",       "CIV",  "CIVICS"),
    (10,  "Economics",    "ECO",  "ECONO"),
    (100, "Health",       "HLT",  "HEALTH"),
    (101, "ICT",          "ICT",  "INFOTECH"),
    (102, "Agriculture",  "AGR",  "AGRISC"),
]

# ── Question types (id, name, code, merp_type_id) ────────────────────────
QUESTION_TYPES = [
    (1, "MultipleChoice", "MCQ  ", "MCQ"),
    (2, "TrueFalse",      "TRF  ", "TRUEFALSE"),
    (3, "FillBlank",      "FBL  ", "FILLBLANK"),
    (4, "MatchPair",      "MTP  ", "MATCHPAIR"),
    (5, "ShortAnswer",    "SHT  ", "SHORTANS"),
    (6, "EssayLong",      "ESS  ", "ESSAYLONG"),
]

# Map SubjectsInfo.SubjectID → eslce_subjects.id
MERP_SUBJECT_TO_ESLCE = {
    "ENGLISH": 1, "AMHAR": 2, "MATH": 3, "PHYSIC": 4, "CHEMIS": 5,
    "BIOLOGY": 6, "HISTOR": 7, "GEOGR": 8, "CIVICS": 9, "ECONO": 10,
    "HEALTH": 100, "INFOTECH": 101, "AGRISC": 102,
}

# Map QuestionTypes.QuestionTypeID → eslce_question_types.id
MERP_TYPE_TO_ESLCE = {
    "MCQ": 1, "TRUEFALSE": 2, "FILLBLANK": 3,
    "MATCHPAIR": 4, "SHORTANS": 5, "ESSAYLONG": 6,
}


def table_empty(cur, table):
    cur.execute(f"SELECT count(*) FROM {table}")
    return cur.fetchone()[0] == 0


def seed_subjects(cur):
    inserted = 0
    for sid, name, code, merp_id in SUBJECTS:
        cur.execute("""
            INSERT INTO eslce_subjects (id, name, code, merp_subject_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, merp_subject_id=EXCLUDED.merp_subject_id
        """, (sid, name, code, merp_id))
        inserted += 1
    print(f"  Subjects: {inserted}")
    return inserted


def seed_question_types(cur):
    inserted = 0
    for tid, name, code, merp_id in QUESTION_TYPES:
        cur.execute("""
            INSERT INTO eslce_question_types (id, name, code, merp_type_id)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, code=EXCLUDED.code, merp_type_id=EXCLUDED.merp_type_id
        """, (tid, name, code, merp_id))
        inserted += 1
    print(f"  Question types: {inserted}")
    return inserted


def seed_from_pascal_tables(conn, cur):
    """
    Read from the PascalCase ESLCE tables in MERP_OSHS and populate the new eslce_* tables.

    Tables used:
      "ESLCEQuestions"      → eslce_questions (via JOIN "Questions" for text)
      "ESLCEQuestionOptions" → eslce_question_options
    Also creates synthetic exams (one per subject) in eslce_exams.
    """
    print("\n  Attempting to read from PascalCase ESLCE tables...")

    # ── Collect questions ─────────────────────────────────────────────────
    # ESLCEQuestions has metadata; Questions has the actual text.
    # We try a LEFT JOIN so we still get rows even if Questions table is empty.
    cur.execute("""
        SELECT
            eq."EQuestionID",
            eq."ESubjectID",
            eq."EQTypeID",
            COALESCE(q."QText", eq."ETopic", 'Question ' || eq."EQuestionID"),
            COALESCE(q."QPoints", eq."EPoints", 1.0),
            eq."EDifficulty",
            q."QExplanation"
        FROM "ESLCEQuestions" eq
        LEFT JOIN "Questions" q ON eq."EQuestionID" = q."QuestionID"
        WHERE eq."QStatus" = 'Active'
        ORDER BY eq."ESubjectID", eq."EQuestionID"
    """)
    question_rows = cur.fetchall()
    print(f"    Found {len(question_rows)} ESLCE questions")

    if not question_rows:
        print("    No questions in PascalCase tables — nothing to migrate.")
        return 0, 0

    # ── Collect options ───────────────────────────────────────────────────
    cur.execute("""
        SELECT "EQuestionID", "EOptionLabel", "EOptionText", "EIsCorrect", "EDisplayOrder"
        FROM "ESLCEQuestionOptions"
        ORDER BY "EQuestionID", "EDisplayOrder"
    """)
    option_rows = cur.fetchall()
    print(f"    Found {len(option_rows)} options")

    # Index options by question ID
    opts_by_q = {}
    for qid, label, text, correct, order in option_rows:
        opts_by_q.setdefault(qid, []).append((label, text, correct, order))

    # ── Map old SubjectIDs → new integer IDs ──────────────────────────────
    # Collect unique old subject IDs from the questions
    old_subject_ids = sorted(set(row[1] for row in question_rows))

    # Try to map them via SubjectsInfo → SubjectID → eslce_subjects.merp_subject_id
    subject_map = {}  # old_id (varchar) → eslce integer id
    for old_id in old_subject_ids:
        # Check if it's already in our SUBJECTS list
        matched = False
        for sid, name, code, merp_id in SUBJECTS:
            if old_id == merp_id or old_id == code:
                subject_map[old_id] = sid
                matched = True
                break
        if not matched:
            # Try SubjectsInfo lookup
            cur.execute('SELECT "SubjectID" FROM "SubjectsInfo" WHERE "SubjectID" = %s', (old_id,))
            row = cur.fetchone()
            if row and row[0] in MERP_SUBJECT_TO_ESLCE:
                subject_map[old_id] = MERP_SUBJECT_TO_ESLCE[row[0]]
            else:
                # Fallback: assign to English (id=1)
                subject_map[old_id] = 1

    # ── Map old type IDs → new integer IDs ────────────────────────────────
    old_type_ids = sorted(set(row[2] for row in question_rows))
    type_map = {}
    for old_id in old_type_ids:
        if old_id in MERP_TYPE_TO_ESLCE:
            type_map[old_id] = MERP_TYPE_TO_ESLCE[old_id]
        else:
            type_map[old_id] = 1  # default MCQ

    # ── Insert questions into eslce_questions ─────────────────────────────
    q_inserted = 0
    q_id_map = {}  # old varchar ID → new integer ID
    for i, (old_qid, old_subj, old_type, text, points, diff, explanation) in enumerate(question_rows, 1):
        new_subject = subject_map.get(old_subj, 1)
        new_type = type_map.get(old_type, 1)
        cur.execute("""
            INSERT INTO eslce_questions (id, subject_id, question_type_id, code, text, marks, difficulty, explanation, source_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'bank')
            ON CONFLICT (id) DO UPDATE SET text=EXCLUDED.text, marks=EXCLUDED.marks
        """, (i, new_subject, new_type, str(old_qid)[:20], text, points, diff, explanation))
        q_id_map[old_qid] = i
        q_inserted += 1

    if q_inserted > 0:
        cur.execute("SELECT setval('eslce_questions_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_questions))")

    print(f"    Inserted {q_inserted} questions into eslce_questions")

    # ── Insert options ────────────────────────────────────────────────────
    o_inserted = 0
    o_id = 0
    for old_qid, opts in opts_by_q.items():
        new_qid = q_id_map.get(old_qid)
        if not new_qid:
            continue
        for label, text, correct, order in opts:
            o_id += 1
            cur.execute("""
                INSERT INTO eslce_question_options (id, question_id, label, text, is_correct, display_order)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET text=EXCLUDED.text, is_correct=EXCLUDED.is_correct
            """, (o_id, new_qid, label[:1] if label else 'A', text, correct, order or 0))
            o_inserted += 1

    if o_inserted > 0:
        cur.execute("SELECT setval('eslce_question_options_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_question_options))")

    print(f"    Inserted {o_inserted} options into eslce_question_options")

    # ── Create synthetic exams (one per subject) ──────────────────────────
    # Group questions by subject, then split into exam-sized chunks
    from collections import defaultdict
    subj_questions = defaultdict(list)
    for i, (old_qid, old_subj, old_type, text, points, diff, explanation) in enumerate(question_rows, 1):
        subj_questions[subject_map.get(old_subj, 1)].append(q_id_map[old_qid])

    exam_id = 0
    eq_id = 0
    years = [2018, 2019, 2020, 2021, 2022, 2023, 2024]
    semesters = ["First Semester", "Second Semester"]

    for subj_id, q_ids in subj_questions.items():
        if not q_ids:
            continue

        # Split questions into exam chunks of ~20
        chunk_size = 20
        year_idx = 0
        sem_idx = 0
        for chunk_start in range(0, len(q_ids), chunk_size):
            chunk = q_ids[chunk_start:chunk_start + chunk_size]
            year = years[year_idx % len(years)]
            semester = semesters[sem_idx % len(semesters)]
            sem_idx += 1
            if sem_idx >= len(semesters):
                sem_idx = 0
                year_idx += 1

            exam_id += 1
            subj_name = next((s[1] for s in SUBJECTS if s[0] == subj_id), "Unknown")
            total_marks = float(len(chunk))

            cur.execute("""
                INSERT INTO eslce_exams (id, subject_id, year, semester, type, title, total_questions, total_marks, duration_minutes, exam_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'past')
                ON CONFLICT (id) DO UPDATE SET subject_id=EXCLUDED.subject_id
            """, (exam_id, subj_id, year, semester, "National",
                  f"{subj_name} {year} {semester}", len(chunk), total_marks, 90))

            for qnum, qid in enumerate(chunk, 1):
                eq_id += 1
                cur.execute("""
                    INSERT INTO eslce_exam_questions (id, exam_id, question_id, question_number, marks_allocated)
                    VALUES (%s, %s, %s, %s, 1.0)
                    ON CONFLICT (id) DO UPDATE SET exam_id=EXCLUDED.exam_id
                """, (eq_id, exam_id, qid, qnum))

    if exam_id > 0:
        cur.execute("SELECT setval('eslce_exams_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_exams))")
        cur.execute("SELECT setval('eslce_exam_questions_id_seq', (SELECT COALESCE(MAX(id),1) FROM eslce_exam_questions))")

    print(f"    Created {exam_id} synthetic exams")
    print(f"    Linked {eq_id} exam-question relationships")
    return q_inserted, exam_id


def verify(cur):
    print("\n=== Verification ===")
    for table in ["eslce_subjects", "eslce_question_types", "eslce_questions",
                   "eslce_question_options", "eslce_exams", "eslce_exam_questions"]:
        cur.execute(f"SELECT count(*) FROM {table}")
        print(f"  {table}: {cur.fetchone()[0]}")


def main():
    print("Connecting to MERP_OSHS...")
    conn = psycopg2.connect(MERP_DSN)
    cur = conn.cursor()

    try:
        # Check current state
        print("\nChecking existing data...")
        for table in ["eslce_subjects", "eslce_questions", "eslce_exams"]:
            cur.execute(f"SELECT count(*) FROM {table}")
            print(f"  {table}: {cur.fetchone()[0]}")

        # 1. Always ensure subjects and question types exist
        print("\nSeeding subjects...")
        seed_subjects(cur)

        print("\nSeeding question types...")
        seed_question_types(cur)

        # 2. If questions are empty, try to migrate from PascalCase tables
        if table_empty(cur, "eslce_questions"):
            print("\n  eslce_questions is empty — attempting migration from PascalCase tables")
            q_count, exam_count = seed_from_pascal_tables(conn, cur)
            if q_count == 0:
                print("\n  ⚠  No data found in PascalCase tables either.")
                print("     The ESLCE library will show subjects but no exams.")
                print("     To populate exams, either:")
                print("     a) Add data to the PascalCase ESLCE tables, or")
                print("     b) Run migrate_eslce_to_merp.py with a separate ESLCE database")
        else:
            print("\n  eslce_questions already has data — skipping migration")

        conn.commit()
        verify(cur)
        print("\n[OK] Seed complete!")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
