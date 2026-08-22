from sqlalchemy import Column, SmallInteger, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class EslceQuestionImage(Base):
    __tablename__ = "eslce_question_images"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, nullable=False)
    image_path = Column(Text, nullable=False)
    image_description = Column(Text)
    display_order = Column(SmallInteger, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())