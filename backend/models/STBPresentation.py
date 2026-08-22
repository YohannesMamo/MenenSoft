from sqlalchemy import Column, String, DateTime, Integer, Boolean, UUID
from database import Base
import uuid

class STBPresentation(Base):
    __tablename__ = 'STBPresentations'
    
    SlideID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    PresentationID = Column(UUID(as_uuid=True), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    STBSectionID = Column(String(50), nullable=False)
    SlideNumber = Column(Integer, nullable=False)
    SlideTitle = Column(String(255))
    STBBasicPresentation = Column(String)
    STBAdvancedPresentation = Column(String)
    STBAIPresentations = Column(String)
    Notes = Column(String)
    DurationSeconds = Column(Integer)
    HasQuiz = Column(Boolean, default=False)
    CreatedAt = Column(DateTime, nullable=False)
    UpdatedAt = Column(DateTime, nullable=False)