from sqlalchemy import Column, String, DateTime, Integer
from database import Base

class HomeWorkAssignment(Base):
    __tablename__ = 'HomeWorkAssignment'
    
    HWAID = Column(String(10), primary_key=True, index=True)
    StudentID = Column(String(10), nullable=False)
    STBID = Column(String(10), nullable=False)
    STBChapterID = Column(Integer)
    STBSectionID = Column(String(50))
    HWATitle = Column(String(100), nullable=False)
    HWADate = Column(DateTime, nullable=False)
    HWADueDate = Column(DateTime, nullable=False)
    HWAPoints = Column(Integer, nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)