from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, text
from sqlalchemy.dialects.postgresql import JSONB
from database import Base


class PaymentVerification(Base):
    __tablename__ = 'payment_verifications'
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(10), nullable=False, index=True)
    reference = Column(String(100), nullable=False, index=True)
    provider = Column(String(50), nullable=True)
    status = Column(String(20), nullable=False, server_default='pending')
    amount = Column(Numeric, nullable=True)
    currency = Column(String(10), nullable=True)
    payer_name = Column(String(255), nullable=True)
    receiver_name = Column(String(255), nullable=True)
    raw_response = Column(JSONB, nullable=True)
    created_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    updated_at = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
