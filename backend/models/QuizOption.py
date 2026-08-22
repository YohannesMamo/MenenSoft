from sqlalchemy import Column, String, DateTime, Boolean, Integer, UUID
from database import Base
import uuid

class QuizOption(Base):
    __tablename__ = 'QuizOptions'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    QuizID = Column(String(10), nullable=False)
    OptionLabel = Column(String, nullable=False)
    OptionText = Column(String, nullable=False)
    QzOpExplanation = Column(String)
    CreatedAt = Column(DateTime)
    IsCorrect = Column(Boolean, default=False)
    DisplayOrder = Column(Integer, default=0)