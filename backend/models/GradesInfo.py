from sqlalchemy import Column, String, DateTime
from database import Base

class GradesInfo(Base):
    __tablename__ = 'GradesInfo'
    __table_args__ = {'extend_existing': True}
    
    GradeID = Column(String(10), primary_key=True, index=True)
    GradeDescription = Column(String(100), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)