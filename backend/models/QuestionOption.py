from sqlalchemy import Column, String, DateTime, Integer, UUID, Boolean
from database import Base
import uuid

class QuestionOption(Base):
    __tablename__ = 'QuestionOptions'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    QuestionID = Column(String(10), nullable=False)
    OptionLabel = Column(String, nullable=False)
    OptionText = Column(String, nullable=False)
    OpExplanation = Column(String)
    CreatedAt = Column(DateTime)
    IsCorrect = Column(Boolean, default=False)
    DisplayOrder = Column(Integer, nullable=False)