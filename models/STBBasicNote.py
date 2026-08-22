from sqlalchemy import Column, String, DateTime, Integer, UUID
from database import Base
import uuid

class STBBasicNote(Base):
    __tablename__ = 'STBBasicNotes'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBSectionID = Column(String(50), nullable=False)
    STBSubSection = Column(String(200), nullable=False)
    STBNotes = Column(String)
    STBSummary = Column(String)
    STBKeywords = Column(String)
    STBSolvEx = Column(String)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)