from sqlalchemy import Column, String, Numeric, Integer
from database import Base

class StudentMetricsMv(Base):
    __tablename__ = 'student_metrics_mv'
    __table_args__ = {'extend_existing': True}
    
    StudentID = Column('StudentID', String(10), primary_key=True)
    TotalStudyHours = Column('total_study_hours', Numeric, nullable=False)
    ImprovementRatePerDay = Column('improvement_rate_per_day', Numeric, nullable=False)
    OverallMasteryPercent = Column('overall_mastery_percent', Numeric, nullable=False)
    AvgExamScore = Column('avg_exam_score', Numeric, nullable=False)
    TotalSessionsCompleted = Column('total_sessions_completed', Integer, nullable=False)