from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class EslceStudentResponse(Base):
    __tablename__ = "eslce_student_responses"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, nullable=False)
    question_id = Column(Integer, nullable=False)
    selected_option_id = Column(Integer)
    is_correct = Column(Boolean)
    verdict = Column(String(20), nullable=False, server_default="unanswered")
    response_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
