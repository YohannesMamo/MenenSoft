from sqlalchemy import Column, Integer, String, SmallInteger, Numeric, DateTime
from sqlalchemy.sql import func
from database import Base


class EslceStudentSession(Base):
    __tablename__ = "eslce_student_sessions"

    id = Column(Integer, primary_key=True)
    session_key = Column(String(64), nullable=False, unique=True)
    student_id = Column(String(10), nullable=False)
    subject_name = Column(String(100))
    exam_id = Column(Integer)
    exam_type = Column(String(20), nullable=False, server_default="past")
    mode = Column(String(20), nullable=False, server_default="exam")
    source_year = Column(Integer)
    title = Column(String(255))
    total_questions = Column(Integer, nullable=False, server_default="0")
    correct_count = Column(Integer, nullable=False, server_default="0")
    wrong_count = Column(Integer, nullable=False, server_default="0")
    unanswered_count = Column(Integer, nullable=False, server_default="0")
    percentage = Column(Numeric)
    time_spent_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
