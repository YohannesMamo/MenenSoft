from sqlalchemy import Column, String, Integer, Numeric
from database import Base

class vStudentProgress(Base):
    __tablename__ = 'vStudentProgress'
    __table_args__ = {'extend_existing': True}
    
    StudentID = Column(String(10), primary_key=True)
    StudentName = Column(String)
    StuGrade = Column(String(10))
    SectionsCompleted = Column(Integer)
    TotalQuizzes = Column(Integer)
    AvgScore = Column(Numeric)
    GrowthIndex = Column(Numeric)
    MasteryStatus = Column(String)
    OpenRemediations = Column(Integer)