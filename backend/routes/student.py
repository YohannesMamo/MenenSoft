from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.StudentInfo import StudentInfo
from models.user import user as UserModel
from routes.auth import get_current_user

router = APIRouter()

@router.get("/info")
async def get_student_info(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    student_info = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    if not student_info:
        raise HTTPException(status_code=404, detail="Student info not found")
    return student_info

@router.get("/{student_id}")
async def get_student_by_id(student_id: str, db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    student_info = db.query(StudentInfo).filter(StudentInfo.StudentID == student_id).first()
    if not student_info:
        raise HTTPException(status_code=404, detail="Student not found")
    return student_info