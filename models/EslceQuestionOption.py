from sqlalchemy import Column, SmallInteger, Integer, String, Text, Boolean
from database import Base


class EslceQuestionOption(Base):
    __tablename__ = "eslce_question_options"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, nullable=False)
    label = Column(String(1), nullable=False)
    text = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False, server_default="false")
    explanation = Column(Text)
    display_order = Column(SmallInteger, nullable=False)
