from sqlalchemy import Column, String
from database import Base

class SystemConfig(Base):
    __tablename__ = 'SystemConfig'
    
    ConfigKey = Column(String(50), primary_key=True, index=True)
    ConfigValue = Column(String)
    Description = Column(String)