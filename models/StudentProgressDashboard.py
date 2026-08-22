from sqlalchemy import Column, String, Integer, Numeric
from database import Base

class StudentProgressDashboard(Base):
    __tablename__ = 'StudentProgressDashboard'
    __table_args__ = {'extend_existing': True}
    
    StudentID = Column(String(10), primary_key=True)
    StudentName = Column(String)
    StuGrade = Column(String(10))
    SubjectDescription = Column(String(100))
    OverallScore = Column(Numeric(5, 2))
    GrowthIndex = Column(Numeric(5, 2))
    MasteryStatus = Column(String(20))
    ConsecutiveMasteryCount = Column(Integer)
    WeeklyAverage = Column(Numeric)
    AvgRetention = Column(Numeric)
    AvgInterventionImpact = Column(Numeric)
    SessionsLast30Days = Column(Integer)