from sqlalchemy import Column, String, DateTime, Integer, UUID, Text
from database import Base
import uuid

class TextHighlight(Base):
    __tablename__ = 'TextHighlights'
    __table_args__ = {'extend_existing': True}
    
    HighlightID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    ChapterID = Column(Integer, nullable=False)
    SectionID = Column(String(10), nullable=False)
    PageNumber = Column(Integer, nullable=False)
    TextContent = Column(Text, nullable=False)
    HighlightColor = Column(String(20), nullable=False, default='yellow')
    Note = Column(Text, nullable=True)
    CreatedAt = Column(DateTime, nullable=False)
    UpdatedAt = Column(DateTime, nullable=False)