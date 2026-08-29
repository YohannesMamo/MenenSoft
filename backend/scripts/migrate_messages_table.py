"""
Migration script to add FileURL column to Messages table

Run this once to update your database schema:
    cd backend
    python scripts/migrate_messages_table.py
"""

import sys
import os

# Add parent directory to path so we can import modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

def migrate_messages_table():
    """Add FileURL column to Messages table if it doesn't exist"""
    
    print("[Migration] Starting Messages table migration...")
    
    # Build database URL
    raw_url = os.getenv("DATABASE_URL")
    if raw_url:
        if raw_url.startswith("postgres://"):
            DATABASE_URL = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif raw_url.startswith("postgresql://"):
            DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        else:
            DATABASE_URL = raw_url
    else:
        # Fallback configuration
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "postgres")
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = os.getenv("DB_PORT", "5432")
        db_name = os.getenv("DB_NAME", "menen_db")
        DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    print(f"[Migration] Database URL: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    
    # Create engine
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        try:
            # Check if column already exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='Messages' AND column_name='FileURL'
            """))
            
            if result.fetchone():
                print("[Migration] ✓ FileURL column already exists")
                connection.commit()
                return True
            
            # Add FileURL column
            print("[Migration] Adding FileURL column to Messages table...")
            connection.execute(text("""
                ALTER TABLE "Messages" 
                ADD COLUMN "FileURL" VARCHAR NULL
            """))
            connection.commit()
            print("[Migration] ✓ FileURL column added successfully")
            return True
            
        except Exception as e:
            print(f"[Migration] ✗ Error: {str(e)}")
            try:
                connection.rollback()
            except:
                pass
            return False

def add_isread_deprecation_comment():
    """Note about IsRead column deprecation"""
    print("[Migration] Note: IsRead column is deprecated - use MessageRead table for read status")

if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Messages Table Update")
    print("=" * 60)
    
    success = migrate_messages_table()
    add_isread_deprecation_comment()
    
    print("=" * 60)
    if success:
        print("✓ Migration completed successfully!")
        print("\nYou can now:")
        print("1. Restart the backend: python backend/main.py")
        print("2. Send messages with files")
    else:
        print("✗ Migration failed - check error above")
    print("=" * 60)
