from sqlalchemy import Column, SmallInteger, Integer, String, Text, Numeric, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class EslceQuestion(Base):
    __tablename__ = "eslce_questions"

    id = Column(Integer, primary_key=True)
    subject_id = Column(SmallInteger, nullable=False)
    question_type_id = Column(SmallInteger, nullable=False)
    code = Column(String(20), nullable=False, unique=True)
    text = Column(Text, nullable=False)
    marks = Column(Numeric(4, 2), nullable=False, server_default="1.00")
    difficulty = Column(String(20))
    explanation = Column(Text)
    source_type = Column(String(20), server_default="bank")
    is_active = Column(Boolean, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
