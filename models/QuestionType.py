from sqlalchemy import Column, String, DateTime, UUID
from database import Base
import uuid

class QuestionType(Base):
    __tablename__ = 'QuestionType'
    
    QuestionTypeID = Column(String(10), primary_key=True, index=True)
    QuestionTypeDescription = Column(String(100), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)
    RecordID = Column(UUID(as_uuid=True))