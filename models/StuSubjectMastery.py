from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from database import Base
import uuid

class StuSubjectMastery(Base):
    __tablename__ = 'StuSubjectMastery'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    OverallScore = Column(Numeric(5, 2))
    TotalQuestionsAttempted = Column(Integer)
    CorrectAnswers = Column(Integer)
    StrengthArea = Column(String(100))
    WeaknessArea = Column(String(100))
    UpdatedAt = Column(DateTime)
    LastAssessmentDate = Column(DateTime)
    GrowthDelta = Column(Numeric(5, 2))
    BaselineScore = Column(Numeric(5, 2))
    CurrentScore = Column(Numeric(5, 2))
    GrowthIndex = Column(Numeric(5, 2))
    ConsecutiveMasteryCount = Column(Integer)
    MasteryStatus = Column(String(20))