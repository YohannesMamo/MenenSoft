"""
Database migration script to create TextHighlights and StudyBookmarks tables
Run this script once to create the new tables: python -m scripts.create_highlight_tables
"""

from database import engine, Base
from models.TextHighlight import TextHighlight
from models.StudyBookmark import StudyBookmark

def create_highlight_tables():
    print("[Migration] Creating TextHighlights table...")
    try:
        TextHighlight.__table__.create(engine, checkfirst=True)
        print("[Migration] ✓ TextHighlights table created successfully")
    except Exception as e:
        print(f"[Migration] ✗ Error creating TextHighlights table: {e}")

    print("[Migration] Creating StudyBookmarks table...")
    try:
        StudyBookmark.__table__.create(engine, checkfirst=True)
        print("[Migration] ✓ StudyBookmarks table created successfully")
    except Exception as e:
        print(f"[Migration] ✗ Error creating StudyBookmarks table: {e}")

    print("[Migration] Migration completed!")

if __name__ == "__main__":
    create_highlight_tables()