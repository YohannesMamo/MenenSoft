from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from database import Base


class EvaluationConfig(Base):
    __tablename__ = "evaluation_config"

    config_key = Column(String(100), primary_key=True)
    config_value = Column(JSONB, nullable=False)
    description = Column(Text)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
