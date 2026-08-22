from sqlalchemy import Column, String, DateTime, Integer, Numeric
from database import Base

class Question(Base):
    __tablename__ = 'Questions'
    __table_args__ = {'extend_existing': True}
    
    QuestionID = Column(String(10), primary_key=True, index=True)
    QTypeID = Column(String(10), nullable=False)
    QSTBID = Column(String(10), nullable=False)
    QSectionID = Column(String(10))
    QText = Column(String, nullable=False)
    QExplanation = Column(String)
    QPoints = Column(Numeric(5, 2), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)
    QDifficulty = Column(String(50))
    QChapterID = Column(Integer)
    QLearningObjective = Column(String(250))
    QCognitiveLevel = Column(String(50))
    QStatus = Column(String(10))