from sqlalchemy import Column, String, DateTime, Numeric
from database import Base

class StuHWAAnswer(Base):
    __tablename__ = 'StuHWAAnswers'
    __table_args__ = {'extend_existing': True}
    
    SHWAAnswerID = Column(String(10), primary_key=True, index=True)
    HWAID = Column(String(10), nullable=False)
    StudentID = Column(String(10), nullable=False)
    SHWAAnswer = Column(String, nullable=False)
    SHWAPoints = Column(Numeric(5, 2), nullable=False)
    SubmittedAt = Column(DateTime)