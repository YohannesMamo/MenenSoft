from sqlalchemy import Column, String, DateTime, Integer, UUID
from database import Base
import uuid

class StudyNote(Base):
    __tablename__ = 'StudyNotes'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    NoteID = Column(Integer, nullable=False)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    ChapterID = Column(Integer, nullable=False)
    SectionID = Column(String(10), nullable=False)
    PageNumber = Column(Integer, nullable=False)
    NoteText = Column(String, nullable=False)
    CreatedAt = Column(DateTime, nullable=False)
    UpdatedAt = Column(DateTime, nullable=False)