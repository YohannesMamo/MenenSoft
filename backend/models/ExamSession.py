from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from database import Base
import uuid

class ExamSession(Base):
    __tablename__ = 'ExamSessions'
    __table_args__ = {'extend_existing': True}
    
    SessionID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10))
    ChapterID = Column(Integer)
    SectionID = Column(String(50))
    SessionType = Column(String(20))
    StartedAt = Column(DateTime)
    CompletedAt = Column(DateTime)
    OverallScore = Column(Numeric(5, 2))
    EndedAt = Column(DateTime)
    TotalQuestions = Column(Integer)
    CorrectAnswers = Column(Integer)
    WrongAnswers = Column(Integer)
    TimeSpentSeconds = Column(Integer)
    AttemptNumber = Column(Integer)