from sqlalchemy import Column, SmallInteger, String
from database import Base


class EslceSubject(Base):
    __tablename__ = "eslce_subjects"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    code = Column(String(10), nullable=False, unique=True)
    merp_subject_id = Column(String(10), nullable=False)
