from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from database import Base
import uuid

class QuizSession(Base):
    __tablename__ = 'QuizSessions'
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
    AttemptNumber = Column(Integer)
    QuizType = Column(String(50))
    TotalQuestions = Column(Integer, nullable=False)
    TimeSpentSeconds = Column(Integer, nullable=False)