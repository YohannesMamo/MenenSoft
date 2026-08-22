from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from database import Base

class StudySession(Base):
    __tablename__ = "StudySessions"
    
    # KEY FIX: Tell SQLAlchemy this column has a server default
    StdySessionID = Column(
        String(15), 
        primary_key=True,
        server_default=func.text("(('STS'::text || lpad(nextval('study_session_seq'::regclass)::text, 12, '0'::text)))")
    )
    
    StudentID = Column(String(10), ForeignKey("StudentInfo.StudentID"), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer, nullable=False)
    StartedAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    EndedAt = Column(DateTime(timezone=True), nullable=True)
    PagesCovered = Column(String(100), nullable=True)
    StuNotes = Column(Text, nullable=True)
    CreatedAt = Column(DateTime(timezone=True), server_default=func.now(), nullable=True)