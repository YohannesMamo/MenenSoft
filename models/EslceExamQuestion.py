from sqlalchemy import Column, SmallInteger, Integer, Numeric
from database import Base


class EslceExamQuestion(Base):
    __tablename__ = "eslce_exam_questions"

    id = Column(Integer, primary_key=True)
    exam_id = Column(Integer, nullable=False)
    question_id = Column(Integer, nullable=False)
    question_number = Column(SmallInteger, nullable=False)
    marks_allocated = Column(Numeric(4, 2), nullable=False, server_default="1.00")
