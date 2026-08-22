from sqlalchemy import Column, String, DateTime, Boolean, UUID
from database import Base
import uuid

class Conversation(Base):
    __tablename__ = 'Conversations'
    
    ConversationID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    CName = Column(String(200))
    IsGroup = Column(Boolean, default=False)
    CreatedAt = Column(DateTime)
    CreatedBy = Column(String(10))
    LastMessageID = Column(UUID(as_uuid=True))