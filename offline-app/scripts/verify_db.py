import sqlite3
db_path = r"E:\Menen Student Assistant\offline-app\content\HIG12A\menen_offline_HIG12A.db"
conn = sqlite3.connect(db_path)
cur = conn.cursor()

print("=== Grade 12 Content Summary ===\n")

# Textbooks
cur.execute("SELECT stb_id, title, subject_id FROM textbooks")
for r in cur.fetchall():
    print(f"  {r[0]} | {r[2]} | {r[1]}")

# Quiz count per textbook
print("\n--- Quizzes per Textbook ---")
cur.execute("""
    SELECT t.stb_id, t.title, COUNT(q.quiz_id) as quiz_count
    FROM textbooks t LEFT JOIN quizzes q ON t.stb_id = q.stb_id
    GROUP BY t.stb_id ORDER BY t.stb_id
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[2]} quizzes")

# Exam questions per textbook
print("\n--- Exam Questions per Textbook ---")
cur.execute("""
    SELECT t.stb_id, t.title, COUNT(eq.question_id) as q_count
    FROM textbooks t LEFT JOIN exam_questions eq ON t.stb_id = eq.stb_id
    GROUP BY t.stb_id ORDER BY t.stb_id
""")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[2]} questions")

# ESLCE summary
print("\n--- ESLCE ---")
cur.execute("SELECT COUNT(*) FROM eslce_questions")
print(f"  Total questions: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM eslce_exams")
print(f"  Total exams: {cur.fetchone()[0]}")

# Section content sample
print("\n--- Section Content Sample ---")
cur.execute("SELECT stb_id, chapter_id, section_id, LENGTH(section_content) as clen FROM textbook_sections WHERE section_content IS NOT NULL LIMIT 5")
for r in cur.fetchall():
    print(f"  {r[0]} ch{r[1]} sec{r[2]}: {r[3]} chars")

# Basic notes sample
print("\n--- Basic Notes Sample ---")
cur.execute("SELECT stb_id, chapter_id, section_id, LENGTH(notes) as nlen FROM basic_notes WHERE notes IS NOT NULL LIMIT 5")
for r in cur.fetchall():
    print(f"  {r[0]} ch{r[1]} sec{r[2]}: {r[3]} chars")

conn.close()
