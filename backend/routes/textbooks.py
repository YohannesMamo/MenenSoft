from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.STextBook import STextBook
from models.STBChapter import STBChapter
from models.STBSection import STBSection
from models.StuSectionProgress import StuSectionProgress
from models.StudentInfo import StudentInfo
from routes.auth import get_current_user

router = APIRouter()

@router.get("/api/textbooks")
def get_textbooks(grade: str | None = None, db: Session = Depends(get_db)):
    query = db.query(STextBook)
    if grade:
        query = query.filter(STextBook.STBGradeID == grade)
    return query.all()

@router.get("/api/textbooks/{stb_id}")
def get_textbook(stb_id: str, db: Session = Depends(get_db)):
    textbook = db.query(STextBook).filter(STextBook.STBID == stb_id).first()
    if not textbook:
        raise HTTPException(status_code=404, detail="Textbook not found")
    return textbook

@router.get("/api/textbooks/{stb_id}/chapters")
def get_textbook_chapters(stb_id: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Get the student ID associated with this user
    student = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    student_id = student.StudentID if student else None
    
    # Pre-fetch all completed sections for this student and textbook
    completed_section_ids = set()
    if student_id:
        completed_records = db.query(StuSectionProgress.STBSectionID).filter(
            StuSectionProgress.StudentID == student_id,
            StuSectionProgress.STBID == stb_id,
            StuSectionProgress.IsCompleted == True
        ).all()
        completed_section_ids = {r[0] for r in completed_records}

    chapters = db.query(STBChapter).filter(STBChapter.STBID == stb_id).order_by(STBChapter.STBChapterID.asc()).all()
    result = []
    for ch in chapters:
        sections = db.query(STBSection).filter(
            STBSection.STBID == stb_id, 
            STBSection.STBChapterID == ch.STBChapterID
        ).order_by(STBSection.STBSectionID.asc()).all()
        result.append({
            "stbChapterID": ch.STBChapterID,
            "stbChapterTitle": ch.STBChapterTitle,
            "sections": [
                {
                    "stbSectionID": s.STBSectionID,
                    "stbSectionTitle": s.STBSectionTitle,
                    "isCompleted": s.STBSectionID in completed_section_ids
                } for s in sections
            ]
        })
    return result
