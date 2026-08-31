from sqlalchemy import Column, String, DateTime, UUID, Boolean
from database import Base
import uuid

class Message(Base):
    __tablename__ = 'Messages'
    
    MessageID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    MConversationID = Column(UUID(as_uuid=True))
    SenderID = Column(String(10))
    MContent = Column(String)  # Text message content only (or empty string if file-only)
    FileURL = Column(String, nullable=True)  # NEW: Separate file URL storage
    SentAt = Column(DateTime)
    # Note: IsRead is deprecated - use MessageRead table for read status (source of truth)