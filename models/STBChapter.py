from sqlalchemy import Column, String, DateTime, Integer, UUID
from database import Base
import uuid

class STBChapter(Base):
    __tablename__ = 'STBChapters'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBChapterTitle = Column(String(500), nullable=False)
    STBChapterStartPage = Column(Integer, nullable=False)
    STBChapterEndPage = Column(Integer, nullable=False)
    CreatedAt = Column(DateTime)