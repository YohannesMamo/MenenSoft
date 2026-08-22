from sqlalchemy import Column, SmallInteger, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from database import Base


class EslceExam(Base):
    __tablename__ = "eslce_exams"

    id = Column(Integer, primary_key=True)
    subject_id = Column(SmallInteger, nullable=False)
    year = Column(SmallInteger, nullable=False)
    semester = Column(String(20), nullable=False)
    type = Column(String(20), nullable=False, server_default="National")
    title = Column(String(200))
    total_questions = Column(SmallInteger, nullable=False, server_default="0")
    total_marks = Column(Numeric(5, 2), nullable=False, server_default="0")
    duration_minutes = Column(SmallInteger)
    exam_type = Column(String(20), nullable=False, server_default="past")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
