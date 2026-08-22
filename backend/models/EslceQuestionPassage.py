from sqlalchemy import Column, Integer, String
from database import Base


class EslceQuestionPassage(Base):
    __tablename__ = "eslce_question_passages"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, nullable=False)
    passage_id = Column(Integer, nullable=False)
    reference_text = Column(String(255))
    paragraph_number = Column(Integer)
    line_start = Column(Integer)
    line_end = Column(Integer)