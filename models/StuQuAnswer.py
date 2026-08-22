from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID, Boolean
from database import Base
import uuid

class StuQuAnswer(Base):
    __tablename__ = 'StuQuAnswer'
    
    SQUAnswerID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    QuestionID = Column(String(10), nullable=False)
    StudentID = Column(String(10), nullable=False)
    SQUAnswer = Column(String, nullable=False)
    SQUPoints = Column(Numeric(5, 2), nullable=False)
    AnsweredAt = Column(DateTime)
    SessionID = Column(UUID(as_uuid=True))
    ResponseTimeSeconds = Column(Integer)
    IsCorrect = Column(Boolean, default=False)
    AttemptOrder = Column(Integer)