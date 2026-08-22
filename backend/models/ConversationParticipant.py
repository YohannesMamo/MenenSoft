from sqlalchemy import Column, String, DateTime, UUID
from database import Base

class ConversationParticipant(Base):
    __tablename__ = 'ConversationParticipants'
    __table_args__ = {'extend_existing': True}

    CPConversationID = Column(UUID(as_uuid=True), primary_key=True)
    CPUserID = Column(String(10), primary_key=True)
    JoinedAt = Column(DateTime)
