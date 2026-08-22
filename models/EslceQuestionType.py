from sqlalchemy import Column, SmallInteger, String, CHAR
from database import Base


class EslceQuestionType(Base):
    __tablename__ = "eslce_question_types"

    id = Column(SmallInteger, primary_key=True)
    name = Column(String(30), nullable=False, unique=True)
    code = Column(CHAR(5), nullable=False, unique=True)
    merp_type_id = Column(String(10), nullable=False)
