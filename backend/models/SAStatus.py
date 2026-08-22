from sqlalchemy import Column, String, UUID
from database import Base
import uuid

class SAStatus(Base):
    __tablename__ = 'SAStatus'
    
    RecordID = Column(UUID(as_uuid=True), default=uuid.uuid4)
    StatusID = Column(String(10), primary_key=True, index=True)
    StatusDescription = Column(String)