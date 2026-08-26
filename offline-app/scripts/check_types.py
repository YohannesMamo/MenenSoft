import psycopg2, psycopg2.extras
conn = psycopg2.connect(host='localhost', port=5432, database='MERP_OSHS', user='postgres', password='GenghisKhan@1200')
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
cur.execute('SELECT "QuestionTypeID" as id, "QuestionTypeDescription" as desc FROM "QuestionType"')
rows = cur.fetchall()
print(f"QuestionType rows: {len(rows)}")
for r in rows:
    print(dict(r))

# Also check what question_type_ids exist in exam questions
cur.execute('SELECT DISTINCT "QTypeID" as id FROM "Questions" LIMIT 20')
rows2 = cur.fetchall()
print(f"\nDistinct QTypeID in Questions: {len(rows2)}")
for r in rows2:
    print(dict(r))

# Check ESLCE question types
cur.execute('SELECT * FROM eslce_question_types')
rows3 = cur.fetchall()
print(f"\neslce_question_types: {len(rows3)}")
for r in rows3:
    print(dict(r))

cur.close()
conn.close()
