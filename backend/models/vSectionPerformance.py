from sqlalchemy import Column, String, Integer, Numeric
from database import Base

class vSectionPerformance(Base):
    __tablename__ = 'vSectionPerformance'
    __table_args__ = {'extend_existing': True}
    
    Textbook = Column(String(500), primary_key=True)
    Chapter = Column(String(500))
    Section = Column(String(255))
    TimesTested = Column(Integer)
    AverageScore = Column(Numeric)
    MasteryCount = Column(Integer)