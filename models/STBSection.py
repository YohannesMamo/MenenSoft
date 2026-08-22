from sqlalchemy import Column, String, DateTime, Integer, UUID
from database import Base
import uuid

class STBSection(Base):
    __tablename__ = 'STBSections'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    STBSectionID = Column(String(50), nullable=False)
    STBSectionTitle = Column(String(255), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBSectionContent = Column(String)
    STBSectionStartPage = Column(Integer)
    STBSectionEndPage = Column(Integer)
    CreatedAt = Column(DateTime, nullable=False)
    UpdatedAt = Column(DateTime, nullable=False)