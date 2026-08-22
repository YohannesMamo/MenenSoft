from sqlalchemy import Column, String, DateTime, Integer
from database import Base

class vRemediationQueue(Base):
    __tablename__ = 'vRemediationQueue'
    __table_args__ = {'extend_existing': True}
    
    RemediationID = Column(Integer, primary_key=True)
    StudentName = Column(String)
    Question = Column(String)
    SectionID = Column(String(50))
    NextReviewDate = Column(DateTime)
    IntervalDays = Column(Integer)
    Status = Column(String(20))