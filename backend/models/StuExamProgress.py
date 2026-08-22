from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID, Boolean
from database import Base
import uuid

class StuExamProgress(Base):
    __tablename__ = 'StuExamProgress'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBSectionID = Column(String(50), nullable=False)
    IsCompleted = Column(Boolean, default=False)
    TimeSpentSeconds = Column(Integer, nullable=False)
    ExamScore = Column(Numeric(5, 2))
    ExamAttempts = Column(Integer, nullable=False)
    LastAccessed = Column(DateTime, nullable=False)
    LastQuizDate = Column(DateTime)
    CreatedAt = Column(DateTime, nullable=False)