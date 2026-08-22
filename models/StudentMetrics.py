from sqlalchemy import Column, String, Numeric
from database import Base

class StudentMetrics(Base):
    __tablename__ = 'student_metrics'
    __table_args__ = {'extend_existing': True}
    
    StudentID = Column('StudentID', String(10), primary_key=True)
    Accuracy = Column('accuracy', Numeric, nullable=False)
    AvgResponseTimeSeconds = Column('avg_response_time_seconds', Numeric, nullable=False)
    Consistency = Column('consistency', Numeric, nullable=False)
    CompletionRate = Column('completion_rate', Numeric, nullable=False)
    LearningGain = Column('learning_gain', Numeric, nullable=False)