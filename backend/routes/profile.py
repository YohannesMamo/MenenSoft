from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from database import get_db
from models.StudentInfo import StudentInfo

router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    firstName: str | None = None
    middleName: str | None = None
    lastName: str | None = None
    phoneMobile: str | None = None
    phoneResidence: str | None = None
    webAddress: str | None = None
    address: str | None = None
    grade: str | None = None
    gender: str | None = None
    dateOfBirth: str | None = None

@router.get("/api/profile/{student_id}")
def get_profile(student_id: str, db: Session = Depends(get_db)):
    student = db.query(StudentInfo).filter(StudentInfo.StudentID == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.put("/api/profile/{student_id}")
def update_profile(student_id: str, request: ProfileUpdateRequest, db: Session = Depends(get_db)):
    student = db.query(StudentInfo).filter(StudentInfo.StudentID == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if request.firstName:
        student.StuFirstName = request.firstName
    if request.middleName is not None:
        student.StuMiddleName = request.middleName
    if request.lastName:
        student.StuLastName = request.lastName
    if request.phoneMobile is not None:
        student.StuPhoneMobile = request.phoneMobile
    if request.phoneResidence is not None:
        student.StuPhoneResidence = request.phoneResidence
    if request.webAddress is not None:
        student.StuWebAddress = request.webAddress
    if request.address is not None:
        student.StuAddress = request.address
    if request.grade:
        student.StuGrade = request.grade
    if request.gender is not None:
        student.StuGender = request.gender
    if request.dateOfBirth:
        student.StuDateOfBirth = datetime.fromisoformat(request.dateOfBirth)
    
    # Mark profile as complete if all required fields are filled
    if (student.StuFirstName and student.StuLastName and 
        student.StuDateOfBirth and student.StuGrade):
        student.IsProfileComplete = True
    
    student.UpdatedAt = datetime.now()
    
    db.commit()
    db.refresh(student)
    return {"message": "Profile updated successfully", "student": student}

@router.post("/api/profile")
def complete_profile(request: dict):
    return {"message": "Profile completed successfully"}

@router.get("/api/student/{student_id}")
def get_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(StudentInfo).filter(StudentInfo.StudentID == student_id).first()
    return student or {}

@router.post("/api/student/complete-registration")
def complete_registration(request: dict):
    return {"message": "Registration completed"}