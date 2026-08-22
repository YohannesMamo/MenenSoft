from sqlalchemy import Column, String, DateTime, Numeric, UUID
from database import Base
import uuid

class RetentionTracking(Base):
    __tablename__ = 'RetentionTracking'
    __table_args__ = {'extend_existing': True}
    
    RetentionID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    SectionID = Column(String(50), nullable=False)
    OriginalScore = Column(Numeric(5, 2), nullable=False)
    OriginalSessionID = Column(UUID(as_uuid=True), nullable=False)
    OriginalDate = Column(DateTime, nullable=False)
    RetestScore = Column(Numeric(5, 2))
    RetestSessionID = Column(UUID(as_uuid=True))
    RetestDate = Column(DateTime)
    RetentionIndex = Column(Numeric(5, 2))
    CalculatedAt = Column(DateTime)