from sqlalchemy import Column, String, DateTime, Numeric, Integer, Boolean
from database import Base

class Quiz(Base):
    __tablename__ = 'Quizzes'
    __table_args__ = {'extend_existing': True}
    
    QuizID = Column(String(10), primary_key=True, index=True)
    QuizTypeID = Column(String(10), nullable=False)
    QzSTBID = Column(String(10), nullable=False)
    QzText = Column(String, nullable=False)
    QzExplanation = Column(String)
    QzPoints = Column(Numeric(5, 2), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)
    QzDifficulty = Column(String(50))
    QzChapterID = Column(Integer)
    QzSectionID = Column(String(10))
    TimeLimitMinutes = Column(Integer)
    AllowRetake = Column(Boolean)
    QzSubjectID = Column(String(10))