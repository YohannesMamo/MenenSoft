import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from dotenv import load_dotenv 
from datetime import datetime

Base = declarative_base()
load_dotenv()
# Dependency function
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# 1. Grab your environment URL safely
raw_url = os.getenv("DATABASE_URL")

# 2. Make sure it explicitly converts the engine prefix and uses the cloud host
if raw_url:
    if raw_url.startswith("postgres://"):
        DATABASE_URL = raw_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_url.startswith("postgresql://"):
        DATABASE_URL = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = raw_url
else:
    # 3. CRITICAL FALLBACK: Force it to default to db.pxxl.pro instead of localhost!
    db_user = os.getenv("DB_USER", "postgres")
    db_pass = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_name = os.getenv("DB_NAME", "MERP_OSHS")
    db_port = os.getenv("DB_PORT", "5432")
    DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

# 4. Spin up the engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)