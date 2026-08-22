from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID, Boolean
from database import Base
import uuid

class StuQzAnswer(Base):
    __tablename__ = 'StuQzAnswer'
    __table_args__ = {'extend_existing': True}
    
    SQZAnswerID = Column(String(10), primary_key=True, index=True)
    QuizID = Column(String(10), nullable=False)
    StudentID = Column(String(10), nullable=False)
    SQZAnswer = Column(String, nullable=False)
    SQZPoints = Column(Numeric(5, 2), nullable=False)
    AnsweredAt = Column(DateTime)
    StuQuestionAttempts = Column(Integer)
    ResponseTimeSeconds = Column(Integer)
    SessionID = Column(UUID(as_uuid=True))
    IsCorrect = Column(Boolean, default=False)
    QuestionOrder = Column(Integer)