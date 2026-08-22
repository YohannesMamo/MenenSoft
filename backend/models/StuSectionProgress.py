from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID, Boolean
from database import Base
import uuid

class StuSectionProgress(Base):
    __tablename__ = 'StuSectionProgress'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBSectionID = Column(String(50), nullable=False)
    IsCompleted = Column(Boolean)
    LastAccessed = Column(DateTime)
    TimeSpentSeconds = Column(Integer)
    QuizAttempts = Column(Integer)
    LastQuizDate = Column(DateTime)
    QuizCompleted = Column(Boolean)
    QuizScore = Column(Numeric(5, 2))
    CreatedAt = Column(DateTime)
    StdySessionID = Column(String(10))