from sqlalchemy import Column, String, DateTime, Integer, UUID
from sqlalchemy.sql import text
from database import Base
import uuid

class GapAnalysis(Base):
    __tablename__ = 'GapAnalysis'
    
    RecordID = Column(Integer, primary_key=True, index=True, server_default=text("nextval('\"GapAnalysis_RecordID_seq\"'::regclass)"))
    SessionID = Column(UUID(as_uuid=True), nullable=False)
    StudentID = Column(String(50), nullable=False)
    SectionID = Column(String(50), nullable=False)
    WeaknessScore = Column(Integer, nullable=False)
    LastMissed = Column(DateTime)