from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from database import Base

class STextBook(Base):
    __tablename__ = 'STextBooks'
    __table_args__ = {'extend_existing': True}
    
    STBID = Column(String(10), primary_key=True, index=True)
    STBTitle = Column(String(500), nullable=False)
    STBSubjectID = Column(String(10), nullable=False)
    STBGradeID = Column(String(10), nullable=False)
    STBPublishedYear = Column(Integer, nullable=False)
    STBUrl = Column(String(500), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)
    STBSize = Column(String(20))
    STBFormat = Column(String(50))
    ChapterCount = Column(Integer)
    SectionCount = Column(Integer)
    
