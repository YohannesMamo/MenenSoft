from sqlalchemy import Column, String,text, DateTime, Boolean, ForeignKey
from database import Base

class StudentInfo(Base):
    __tablename__ = 'StudentInfo'
    __table_args__ = {'extend_existing': True}
    
     # Tell SQLAlchemy that the database generates this value via trigger/sequence
    StudentID = Column(
        String(10),
        primary_key=True,
        server_default=text("('STU'::text || lpad(nextval('student_id_seq'::regclass)::text, 7, '0'::text))")
    )
    StuFirstName = Column(String(50), nullable=False)
    StuMiddleName = Column(String(50))
    StuLastName = Column(String(50), nullable=False)
    StuDateOfBirth = Column(DateTime, nullable=False)
    IsProfileComplete = Column(Boolean, default=False)
    SubscriptionStatus = Column(String(20), default="Free")
    StuPhoneMobile = Column(String(20))
    StuPhoneResidence = Column(String(20))
    StuWebAddress = Column(String(200))
    StuAddress = Column(String(300))
    StuPicture = Column(String)
    StuGrade = Column(String(10), nullable=False)
    CreatedAt = Column(DateTime)
    UpdatedAt = Column(DateTime)
    StuGender = Column(String(50))
    StuStatus = Column(String(10))
    UserID = Column(String(10), ForeignKey('users.UserID'))
    ReportingPersonName = Column(String(100))
    ReportingPersonPhone = Column(String(20))
    ReportingPersonRelation = Column(String(50))