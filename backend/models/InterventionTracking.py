from sqlalchemy import Column, String, DateTime, Numeric, UUID, Integer
from database import Base
import uuid

class InterventionTracking(Base):
    __tablename__ = 'InterventionTracking'
    __table_args__ = {'extend_existing': True}
    
    InterventionID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    StudentID = Column(String(10), nullable=False)
    RemediationID = Column(Integer, nullable=False)
    PreRemediationScore = Column(Numeric(5, 2), nullable=False)
    PostRemediationScore = Column(Numeric(5, 2))
    InterventionEffectiveness = Column(Numeric(5, 2))
    InterventionDate = Column(DateTime)