# models/user.py
from sqlalchemy import Column, String, DateTime, Boolean, text
from database import Base
from datetime import datetime

class user(Base):
    __tablename__ = 'users'
    
    # Primary key with auto-generation
    UserID = Column(
        String(10), 
        primary_key=True,
        server_default=text("('USR'::text || lpad(nextval('user_id_seq'::regclass)::text, 7, '0'::text))")
    )
    
    Email = Column(String(255), nullable=False, unique=True)
    PasswordHash = Column(String(255), nullable=False)
    PasswordSalt = Column(String(255), nullable=False, server_default='')
    Role = Column(String(50), nullable=False, server_default='Student')
    LastLogin = Column(DateTime)
    CreatedOn = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    UpdatedOn = Column(DateTime, server_default=text('CURRENT_TIMESTAMP'))
    UpdatedAt = Column(DateTime)
    
    # ✅ NEW FIELDS FOR EMAIL VERIFICATION
    is_active = Column(Boolean, server_default='true')
    is_superuser = Column(Boolean, server_default='false')
    is_verified = Column(Boolean, server_default='false')
    verification_token = Column(String(64), nullable=True)
    
    # ✅ NEW FIELDS FOR PASSWORD RESET
    reset_token = Column(String(64), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<User {self.Email}>"