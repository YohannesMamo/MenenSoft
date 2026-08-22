from sqlalchemy import Column, SmallInteger, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class EslcePassage(Base):
    __tablename__ = "eslce_passages"

    id = Column(Integer, primary_key=True)
    subject_id = Column(SmallInteger, nullable=False)
    passage_code = Column(String(50), nullable=False)
    title = Column(String(200))
    content = Column(Text, nullable=False)
    word_count = Column(Integer)
    source = Column(Text)
    exam_year = Column(SmallInteger)
    display_order = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())