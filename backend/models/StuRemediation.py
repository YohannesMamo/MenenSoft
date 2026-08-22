from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from sqlalchemy.sql import text
from database import Base
import uuid

class StuRemediation(Base):
    __tablename__ = 'StuRemediations'
    __table_args__ = {'extend_existing': True}
    
    RemediationID = Column(Integer, primary_key=True, index=True, server_default=text("nextval('\"StuRemediations_RemediationID_seq\"'::regclass)"))
    StudentID = Column(String(10), nullable=False)
    QuizID = Column(String(10), nullable=False)
    AttemptCount = Column(Integer)
    LastMissed = Column(DateTime)
    Status = Column(String(20))
    IntervalDays = Column(Integer, nullable=False)
    NextReviewDate = Column(DateTime, nullable=False)
    SourceType = Column(String(20))
    QuestionID = Column(String(10))
    SubjectID = Column(String(10))
    ChapterID = Column(Integer)
    SectionID = Column(String(50))
    SourceID = Column(UUID(as_uuid=True))
    EaseFactor = Column(Numeric(4, 2))
    Interval = Column(Integer)