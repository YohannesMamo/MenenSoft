from sqlalchemy import Column, String, DateTime, Integer, UUID
from database import Base
import uuid

class HWAQuestion(Base):
    __tablename__ = 'HWAQuestion'
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    HWAID = Column(String(10), nullable=False)
    HWAQuestion1 = Column(String, nullable=False)
    HWAAnswer = Column(String, nullable=False)
    HWAPoints = Column(Integer, nullable=False)
    CreatedAt = Column(DateTime)