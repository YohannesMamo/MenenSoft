from sqlalchemy import Column, String, DateTime, Integer, Numeric, UUID
from database import Base
import uuid

class StudentMastery(Base):
    __tablename__ = 'StudentMastery'
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    TotalQuestionsAttempted = Column(Integer)
    TotalCorrectAnswers = Column(Integer)
    AverageScore = Column(Numeric(5, 2))
    StrengthArea = Column(String(100))
    WeaknessArea = Column(String(100))
    ConfidenceLevel = Column(Numeric(5, 2))
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)