from sqlalchemy import Column, String, UUID, Boolean, Integer
from sqlalchemy.sql import text
from database import Base
import uuid

class ExamSessionQuestion(Base):
    __tablename__ = 'ExamSessionQuestions'
    __table_args__ = {'extend_existing': True}
    
    Id = Column(Integer, primary_key=True, index=True, server_default=text("nextval('\"ExamSessionQuestions_Id_seq\"'::regclass)"))
    SessionID = Column(UUID(as_uuid=True), nullable=False)
    QuestionID = Column(String(10), nullable=False)
    Answered = Column(Boolean, default=False)