from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from database import Base
import uuid

class StudySchedule(Base):
    __tablename__ = 'StudySchedules'
    __table_args__ = {'extend_existing': True}
    
    ScheduleID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    ChapterID = Column(Integer, nullable=False)
    SectionID = Column(String(50), nullable=False)
    NextReviewDate = Column(DateTime, nullable=False)
    IntervalDays = Column(Integer)
    EaseFactor = Column(Numeric(3, 2))