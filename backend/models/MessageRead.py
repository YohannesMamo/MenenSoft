from sqlalchemy import Column, String, DateTime, UUID
from database import Base
import uuid

class MessageRead(Base):
    __tablename__ = 'MessageReads'
    __table_args__ = {'extend_existing': True}
    
    MRMessageID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    MRUserID = Column(String(10), primary_key=True)
    ReadAt = Column(DateTime)