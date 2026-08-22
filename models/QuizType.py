from sqlalchemy import Column, String, DateTime
from database import Base

class QuizType(Base):
    __tablename__ = 'QuizType'
    
    QuizTypeID = Column(String(10), primary_key=True, index=True)
    QuizTypeDescription = Column(String(100), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)