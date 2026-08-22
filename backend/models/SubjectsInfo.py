from sqlalchemy import Column, String, DateTime
from database import Base

class SubjectsInfo(Base):
    __tablename__ = 'SubjectsInfo'
    __table_args__ = {'extend_existing': True}
    
    SubjectID = Column(String(10), primary_key=True, index=True)
    SubjectDescription = Column(String(100))
    SubCategoryID = Column(String(10))
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)