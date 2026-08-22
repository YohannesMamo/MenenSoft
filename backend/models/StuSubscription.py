from sqlalchemy import Column, String, DateTime, Numeric, UUID
from database import Base
import uuid

class StuSubscription(Base):
    __tablename__ = 'StuSubscription'
    __table_args__ = {'extend_existing': True}
    
    RecordID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    SubscriptionDate = Column(DateTime, nullable=False)
    PaymentAmount = Column(Numeric(10, 2), nullable=False)
    SubscriptionDocumentID = Column(String(10), nullable=False)
    CreatedAt = Column(DateTime)
    PaymentType = Column(String(50))