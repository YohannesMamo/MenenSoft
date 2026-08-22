from sqlalchemy import Column, String, DateTime
from database import Base

class SUbjectCategory(Base):
    __tablename__ = 'SUbjectCategory'
    __table_args__ = {'extend_existing': True}
    
    SubCategoryID = Column(String(10), primary_key=True, index=True)
    SubCategoryDescription = Column(String(100), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)