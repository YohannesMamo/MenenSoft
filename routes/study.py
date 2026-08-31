from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models.SubjectsInfo import SubjectsInfo
from models.GradesInfo import GradesInfo
from models.StudentInfo import StudentInfo
from models.STextBook import STextBook
from models.STBChapter import STBChapter
from models.STBSection import STBSection
from models.STBBasicNote import STBBasicNote
from models.STBPresentation import STBPresentation
from models.StuSectionProgress import StuSectionProgress
from models.StudyNote import StudyNote
from typing import Optional
from models.user import user
from pathlib import Path
import os
import uuid
from datetime import datetime
from models.StudySession import StudySession  # Assuming you have this model
from pydantic import BaseModel

router = APIRouter()


# Test endpoint to verify PDF accessibility*************************
@router.get("/api/study/test-pdf/{stb_id}")
def test_pdf_access(stb_id: str):
    print(f"[Study API] /api/study/test-pdf/{stb_id} called")
    
    # Map STBID to PDF filename
    stbid_to_pdf = {
        # G9
        "GR9-AMH": "GR9AMHARIC.pdf",
        "GR9-BIO": "GR9BIOLOGY.pdf",
        "GR9-CHE": "GR9CHEMISTRY.pdf",
        "GR9-CIT": "GR9CITIZENSHIP.pdf",
        "GR9-ECO": "GR9ECONOMICS.pdf",
        "GR9-ENG": "GR9ENGLISH.pdf",
        "GR9-GEO": "GR9GEOGRAPHY.pdf",
        "GR9-HEA": "GR9HEALTH.pdf",
        "GR9-HIS": "GR9HISTORY.pdf",
        "GR9-ICT": "GR9ICT.pdf",
        "GR9-MAT": "GR9MATHEMATICS.pdf",
        "GR9-PHY": "GR9PHYSICS.pdf",
        # G10
        "GR10-AMH": "GR10AMHARIC.pdf",
        "GR10-BIO": "GR10BIOLOGY.pdf",
        "GR10-CHE": "GR10CHEMISTRY.pdf",
        "GR10-CIT": "GR10CITIZENSHIP.pdf",
        "GR10-ECO": "GR10ECONOMICS.pdf",
        "GR10-ENG": "GR10ENGLISH.pdf",
        "GR10-GEO": "GR10GEOGRAPHY.pdf",
        "GR10-HEA": "GR10HEALTH.pdf",
        "GR10-HIS": "GR10HISTORY.pdf",
        "GR10-ICT": "GR10ICT.pdf",
        "GR10-MAT": "GR10MATHEMATICS.pdf",
        "GR10-PHY": "GR10PHYSICS.pdf",
        # G11
        "GR11-AGR": "GR11AGRICULTURE.pdf",
        "GR11-BIO": "GR11BIOLOGY.pdf",
        "GR11-CHE": "GR11CHEMISTRY.pdf",
        "GR11-ECO": "GR11ECONOMICS.pdf",
        "GR11-ENG": "GR11ENGLISH.pdf",
        "GR11-GEO": "GR11GEOGRAPHY.pdf",
        "GR11-HIS": "GR11HISTORY.pdf",
        "GR11-ICT": "GR11ICT.pdf",
        "GR11-MAT": "GR11MATHEMATICS.pdf",
        "GR11-PHY": "GR11PHYSICS.pdf",
        # G12
        "GR12-AGR": "GR12AGRICULTURE.pdf",
        "GR12-BIO": "GR12BIOLOGY.pdf",
        "GR12-CHE": "GR12CHEMISTRY.pdf",
        "GR12-ECO": "GR12ECONOMICS.pdf",
        "GR12-ENG": "GR12ENGLISH.pdf",
        "GR12-GEO": "GR12GEOGRAPHY.pdf",
        "GR12-HIS": "GR12HISTORY.pdf",
        "GR12-ICT": "GR12ICT.pdf",
        "GR12-MAT": "GR12MATHEMATICS.pdf",
        "GR12-PHY": "GR12PHYSICS.pdf",
    }
    
    # Determine grade folder
    if stb_id.startswith("GR9"):
        grade_str = "G9"
    elif stb_id.startswith("GR10"):
        grade_str = "G10"
    elif stb_id.startswith("GR11"):
        grade_str = "G11"
    elif stb_id.startswith("GR12"):
        grade_str = "G12"
    elif stb_id.startswith("HIG"):
        grade_num = stb_id[3:5]
        grade_str = f"G{grade_num}"
    else:
        grade_str = "G10"
    
    pdf_filename = stbid_to_pdf.get(stb_id, f"{stb_id}.pdf")
    
    # Check if file exists
    backend_dir = Path(__file__).parent.parent
    textbooks_path = backend_dir / "Textbooks" / grade_str / pdf_filename
    
    result = {
        "stb_id": stb_id,
        "grade_str": grade_str,
        "pdf_filename": pdf_filename,
        "expected_url": f"/textbooks/{grade_str}/{pdf_filename}",
        "file_exists": textbooks_path.exists(),
        "file_path": str(textbooks_path),
        "file_size": textbooks_path.stat().st_size if textbooks_path.exists() else 0
    }
    
    print(f"[Study API] PDF test result: {result}")
    return result

from core.config import settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)
# 3. HELPER FUNCTION - ADD IT HERE 👇
def get_pdf_url(textbook, grade: str = None) -> str:
    """Get PDF URL from database or construct fallback path"""
    
    # First priority: Use STBUrl from database
    if textbook.STBUrl:
        return textbook.STBUrl
    
    # Second priority: Use STBGradeID from database
    grade_id = grade or textbook.STBGradeID
    
    # Extract grade number
    grade_str = ""
    if grade_id:
        if grade_id.startswith("HIG"):
            grade_num = grade_id[3:5]
            grade_str = f"G{grade_num}"
        elif grade_id.startswith("GR"):
            grade_num = grade_id[2:4]
            grade_str = f"G{grade_num}"
        else:
            grade_str = grade_id
    else:
        # Last resort: extract from STBID
        if textbook.STBID.startswith("GR"):
            grade_num = textbook.STBID[2:4]
            grade_str = f"G{grade_num}"
        elif textbook.STBID.startswith("HIG"):
            grade_num = textbook.STBID[3:5]
            grade_str = f"G{grade_num}"
    
    return f"/textbooks/{grade_str}/{textbook.STBID}.pdf"

async def optional_get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user_data = db.query(user).filter(user.UserID == user_id).first()
        return user_data
    except JWTError:
        return None

@router.get("/api/study/student-grade")
async def get_student_grade(db: Session = Depends(get_db), current_user: Optional[any] = Depends(optional_get_current_user)):
    print(f"[Study API] /api/study/student-grade called")
    try:
        if current_user:
            student = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
            if student:
                print(f"[Study API] Found student grade: {student.StuGrade}")
                return {"grade": student.StuGrade}
    except Exception as e:
        print(f"[Study API] Error with authentication, returning default grade: {e}")
    print(f"[Study API] Student not found or auth failed, returning default grade: HIG11A")
    return {"grade": "HIG11A"}

@router.get("/api/study/subjects")
def get_subjects(db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/subjects called")
    subjects = db.query(SubjectsInfo).all()
    print(f"[Study API] Found {len(subjects)} subjects")
    return subjects

@router.get("/api/study/grades")
def get_grades(db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/grades called")
    grades = db.query(GradesInfo).all()
    print(f"[Study API] Found {len(grades)} grades")
    return grades

@router.get("/api/study/textbooks")
def get_textbooks_by_grade(grade: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/textbooks called with grade: {grade}")
    
    textbooks = db.query(STextBook).filter(STextBook.STBGradeID == grade).all()
    print(f"[Study API] Found {len(textbooks)} textbooks for grade {grade}")
    
    result = []
    for t in textbooks:
        # Get chapters for this textbook, ordered by chapter ID
        chapters = db.query(STBChapter).filter(STBChapter.STBID == t.STBID).order_by(STBChapter.STBChapterID.asc()).all()
        
        chapter_list = []
        for ch in chapters:
            # Get sections for this chapter, ordered by section ID
            sections = db.query(STBSection).filter(
                STBSection.STBID == t.STBID, 
                STBSection.STBChapterID == ch.STBChapterID
            ).order_by(STBSection.STBSectionID.asc()).all()
            
            chapter_list.append({
                "id": ch.STBChapterID,
                "number": ch.STBChapterID,
                "title": ch.STBChapterTitle,
                "sections": [
                    {
                        "id": s.STBSectionID,
                        "number": s.STBSectionID,
                        "title": s.STBSectionTitle,
                        "sectionId": s.STBSectionID,
                        "startPage": s.STBSectionStartPage if hasattr(s, 'STBSectionStartPage') else None
                    } for s in sections
                ]
            })
        
        # ✅ Use database STBUrl if available
        pdf_url = None
        if t.STBUrl:
            pdf_url = t.STBUrl
            print(f"[Study API] Using STBUrl for {t.STBID}: {pdf_url}")
        else:
            # Fallback: construct from grade and STBID (no hard-coded mapping)
            grade_str = ""
            if grade:
                # Extract grade number from grade parameter (e.g., "HIG9A" → "G9")
                if grade.startswith("HIG"):
                    grade_num = grade[3:5]
                    grade_str = f"G{grade_num}"
                elif grade.startswith("GR"):
                    grade_num = grade[2:4]
                    grade_str = f"G{grade_num}"
                else:
                    grade_str = grade
            
            # Use STBID as filename (or better: store filename in database)
            pdf_filename = f"{t.STBID}.pdf"
            pdf_url = f"/textbooks/{grade_str}/{pdf_filename}"
            print(f"[Study API] Using constructed PDF path for {t.STBID}: {pdf_url}")
        
        result.append({
            "id": t.STBID,
            "name": t.STBTitle,
            "subject": t.STBSubjectID,
            "grade": t.STBGradeID,
            "code": t.STBID,
            "pdfUrl": pdf_url,
            "chapters": chapter_list
        })
    
    return result
@router.get("/api/study/textbook/{stb_id}")
def get_study_textbook(stb_id: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/textbook/{stb_id} called")
    
    textbook = db.query(STextBook).filter(STextBook.STBID == stb_id).first()
    if not textbook:
        print(f"[Study API] Textbook not found for id: {stb_id}")
        raise HTTPException(status_code=404, detail="Textbook not found")
    
    print(f"[Study API] Found textbook: {textbook.STBTitle}")
    
    # ✅ Use database STBUrl if available
    pdf_url = None
    if textbook.STBUrl:
        pdf_url = textbook.STBUrl
        print(f"[Study API] Using STBUrl from database: {pdf_url}")
    else:
        # Fallback: construct path from grade folder (still better than hard-coded mapping)
        # Determine grade folder from STBGradeID which should be in the database
        grade_str = ""
        if textbook.STBGradeID:
            # If STBGradeID is like "HIG9A" or "GR9", extract the grade number
            if textbook.STBGradeID.startswith("HIG"):
                grade_num = textbook.STBGradeID[3:5]  # "HIG9A" → "9"
                grade_str = f"G{grade_num}"
            elif textbook.STBGradeID.startswith("GR"):
                grade_num = textbook.STBGradeID[2:4]  # "GR9" → "9"
                grade_str = f"G{grade_num}"
            else:
                grade_str = textbook.STBGradeID
        else:
            # Last resort: extract from STBID
            if textbook.STBID.startswith("GR"):
                grade_num = textbook.STBID[2:4]
                grade_str = f"G{grade_num}"
            elif textbook.STBID.startswith("HIG"):
                grade_num = textbook.STBID[3:5]
                grade_str = f"G{grade_num}"
        
        # Use STBID as filename (or better: store filename in database)
        pdf_filename = f"{textbook.STBID}.pdf"
        pdf_url = f"/textbooks/{grade_str}/{pdf_filename}"
        print(f"[Study API] Using constructed PDF path: {pdf_url}")
    
    return {
        "stbId": textbook.STBID,
        "title": textbook.STBTitle,
        "subject": textbook.STBSubjectID,
        "grade": textbook.STBGradeID,
        "pdfUrl": pdf_url,
        "pdfPath": pdf_url.replace("/textbooks/", "") if pdf_url else None
    }
@router.get("/api/study/chapters/{stb_id}")
def get_chapters_by_textbook(stb_id: str, db: Session = Depends(get_db), current_user = Depends(optional_get_current_user)):
    print(f"[Study API] /api/study/chapters/{stb_id} called")

    # Resolve the student from the authenticated user (token) so per-section
    # completion can be hydrated from the server, not just localStorage.
    student_id = None
    if current_user is not None:
        student_rec = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
        student_id = student_rec.StudentID if student_rec else None

    completed_section_ids = set()
    if student_id:
        completed_rows = db.query(StuSectionProgress.STBSectionID).filter(
            StuSectionProgress.StudentID == student_id,
            StuSectionProgress.STBID == stb_id,
            StuSectionProgress.IsCompleted == True
        ).all()
        completed_section_ids = {r[0] for r in completed_rows}

    chapters = db.query(STBChapter).filter(STBChapter.STBID == stb_id).order_by(STBChapter.STBChapterID.asc()).all()
    print(f"[Study API] Found {len(chapters)} chapters for textbook: {stb_id}")
    
    result = []
    for c in chapters:
        # Get sections for this chapter
        sections = db.query(STBSection).filter(
            STBSection.STBID == stb_id,
            STBSection.STBChapterID == c.STBChapterID
        ).order_by(STBSection.STBSectionID.asc()).all()
        
        result.append({
            "id": c.STBChapterID,
            "title": c.STBChapterTitle,
            "chapterId": c.STBChapterID,
            "order": c.STBChapterOrder if hasattr(c, 'STBChapterOrder') else 0,
            "textbookId": c.STBID,
            "sections": [
                {
                    "sectionId": s.STBSectionID,
                    "title": s.STBSectionTitle,
                    "chapterId": s.STBChapterID,
                    "startPage": s.STBSectionStartPage,
                    "endPage": s.STBSectionEndPage,
                    "isCompleted": s.STBSectionID in completed_section_ids
                }
                for s in sections
            ]
        })
    
    return result

@router.get("/api/study/sections/{textbook_id}")
def get_sections_by_textbook(textbook_id: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/sections/{textbook_id} called")
    sections = db.query(STBSection).filter(STBSection.STBID == textbook_id).order_by(STBSection.STBSectionID.asc()).all()
    print(f"[Study API] Found {len(sections)} sections for textbook: {textbook_id}")
    return [
        {
            "sectionId": s.STBSectionID,
            "title": s.STBSectionTitle,
            "chapterId": s.STBChapterID,
            "startPage": s.STBSectionStartPage,
            "endPage": s.STBSectionEndPage
        }
        for s in sections
    ]

@router.get("/api/study/sections/{stb_id}/{chapter_id}")
def get_sections_by_chapter(stb_id: str, chapter_id: int, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/sections/{stb_id}/{chapter_id} called")
    sections = db.query(STBSection).filter(
        STBSection.STBID == stb_id,
        STBSection.STBChapterID == chapter_id
    ).order_by(STBSection.STBSectionID.asc()).all()
    print(f"[Study API] Found {len(sections)} sections for chapter {chapter_id}")
    return [
        {
            "id": s.STBSectionID,
            "title": s.STBSectionTitle
        }
        for s in sections
    ]

@router.get("/api/study/basic-notes/{stb_id}/{chapter_id}/{section_id}")
def get_basic_notes(stb_id: str, chapter_id: int, section_id: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/basic-notes/{stb_id}/{chapter_id}/{section_id} called")
    print(f"[Study API] Query params - stb_id: '{stb_id}' (type: {type(stb_id)}), chapter_id: {chapter_id} (type: {type(chapter_id)}), section_id: '{section_id}' (type: {type(section_id)})")
    
    # First, let's check what records exist for this textbook
    all_notes_for_book = db.query(STBBasicNote).filter(STBBasicNote.STBID == stb_id).all()
    print(f"[Study API] Total basic notes for textbook '{stb_id}': {len(all_notes_for_book)}")
    
    if len(all_notes_for_book) > 0:
        print(f"[Study API] Sample record - STBChapterID: {all_notes_for_book[0].STBChapterID} (type: {type(all_notes_for_book[0].STBChapterID)}), STBSectionID: '{all_notes_for_book[0].STBSectionID}' (type: {type(all_notes_for_book[0].STBSectionID)})")
    
    basic_note = db.query(STBBasicNote).filter(
        STBBasicNote.STBID == stb_id,
        STBBasicNote.STBChapterID == chapter_id,
        STBBasicNote.STBSectionID == section_id
    ).first()
    
    if basic_note:
        print(f"[Study API] Found basic note for section {section_id}: {basic_note.STBNotes[:50] if basic_note.STBNotes else 'empty'}...")
        return {
            "stbnotes": basic_note.STBNotes or "",
            "stbsummary": basic_note.STBSummary or "",
            "stbkeywords": basic_note.STBKeywords or "",
            "stbsolvEx": basic_note.STBSolvEx or ""
        }
    else:
        print(f"[Study API] No basic note found for section {section_id} with exact match")
        return {
            "stbnotes": "",
            "stbsummary": "",
            "stbkeywords": "",
            "stbsolvEx": ""
        }

@router.get("/api/study/student-notes/{student_id}/{stb_id}/{chapter_id}/{section_id}")
def get_student_notes(student_id: str, stb_id: str, chapter_id: int, section_id: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/student-notes/{student_id}/{stb_id}/{chapter_id}/{section_id} called")
    print(f"[Study API] Params - student_id: '{student_id}', stb_id: '{stb_id}', chapter_id: {chapter_id}, section_id: '{section_id}'")
    
    # Check if student notes exist
    all_notes = db.query(StudyNote).filter(StudyNote.StudentID == student_id).all()
    print(f"[Study API] Total notes for student '{student_id}': {len(all_notes)}")
    
    note = db.query(StudyNote).filter(
        StudyNote.StudentID == student_id,
        StudyNote.STBID == stb_id,
        StudyNote.ChapterID == chapter_id,
        StudyNote.SectionID == section_id
    ).first()
    
    if note:
        print(f"[Study API] Found student note")
        return {
            "noteText": note.NoteText,
            "studentId": note.StudentID,
            "stbId": note.STBID,
            "chapterId": note.ChapterID,
            "sectionId": note.SectionID
        }
    else:
        print(f"[Study API] No student note found")
        raise HTTPException(status_code=404, detail="Student note not found")

@router.post("/api/study/student-notes")
def save_student_notes(db: Session = Depends(get_db), studentId: str = None, stbid: str = None, chapterId: int = None, sectionId: str = None, noteText: str = None, pageNumber: int = None, timestamp: str = None):
    print(f"[Study API] POST /api/study/student-notes called")
    print(f"[Study API] Data: studentId={studentId}, stbid={stbid}, chapterId={chapterId}, sectionId={sectionId}")
    
    if not studentId or not stbid or not chapterId or not sectionId:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Check if note already exists
    existing_note = db.query(StudyNote).filter(
        StudyNote.StudentID == studentId,
        StudyNote.STBID == stbid,
        StudyNote.ChapterID == chapterId,
        StudyNote.SectionID == sectionId
    ).first()
    
    if existing_note:
        # Update existing note
        existing_note.NoteText = noteText
        existing_note.PageNumber = pageNumber if pageNumber else existing_note.PageNumber
        existing_note.UpdatedAt = datetime.now()
        db.commit()
        print(f"[Study API] Updated existing student note")
        return {"status": "updated", "message": "Note updated successfully"}
    else:
        # Create new note
        new_note = StudyNote(
            NoteID=0,  # Will be handled by database or can be auto-incremented
            StudentID=studentId,
            STBID=stbid,
            ChapterID=chapterId,
            SectionID=sectionId,
            PageNumber=pageNumber if pageNumber else 1,
            NoteText=noteText,
            CreatedAt=datetime.now(),
            UpdatedAt=datetime.now()
        )
        db.add(new_note)
        db.commit()
        print(f"[Study API] Created new student note")
        return {"status": "created", "message": "Note saved successfully"}

@router.get("/api/study/presentation/{stb_id}/{chapter_id}/{section_id}")
def get_presentation(stb_id: str, chapter_id: int, section_id: str, db: Session = Depends(get_db)):
    print(f"[Study API] /api/study/presentation/{stb_id}/{chapter_id}/{section_id} called")
    print(f"[Study API] Query params - stb_id: '{stb_id}' (type: {type(stb_id)}), chapter_id: {chapter_id} (type: {type(chapter_id)}), section_id: '{section_id}' (type: {type(section_id)})")
    
    presentations = db.query(STBPresentation).filter(
        STBPresentation.STBID == stb_id,
        STBPresentation.STBChapterID == chapter_id,
        STBPresentation.STBSectionID == section_id
    ).order_by(STBPresentation.SlideNumber.asc()).all()
    
    print(f"[Study API] Found {len(presentations)} presentations for section {section_id}")
    
    if presentations and presentations[0].STBBasicPresentation:
        print(f"[Study API] Found {len(presentations)} presentation slides for section {section_id}")
        return [
            {
                "slideId": str(p.SlideID),
                "slideNumber": p.SlideNumber,
                "slideTitle": p.SlideTitle or "",
                "basicPresentation": p.STBBasicPresentation or "",
                "advancedPresentation": p.STBAdvancedPresentation or "",
                "aiPresentation": p.STBAIPresentations or "",
                "notes": p.Notes or "",
                "durationSeconds": p.DurationSeconds or 0,
                "hasQuiz": p.HasQuiz or False
            }
            for p in presentations
        ]
    else:
        print(f"[Study API] No presentations found for section {section_id}")
        return []



# Define the request model
class ProgressCompleteRequest(BaseModel):
    studentId: str
    textbookId: str
    chapterId: int
    sectionId: str
    timeSpentSeconds: int
    pageNumber: int

# ============================================
# THE FUNCTION - ALL CODE BELOW MUST BE INDENTED INSIDE IT
# ============================================
@router.post("/api/study/progress/complete")
def mark_section_complete(request: ProgressCompleteRequest, db: Session = Depends(get_db), current_user = Depends(optional_get_current_user)):
    print("=" * 50)
    print(f"[Study API] /api/study/progress/complete called")
    print(f"[Study API] Request data: {request}")
    print("=" * 50)
    
    # Prefer the authenticated user's StudentID (from token) over the
    # client-supplied studentId, which can be null/stale in localStorage.
    student_id = request.studentId
    if current_user is not None:
        student_rec = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
        if student_rec is not None:
            student_id = student_rec.StudentID

    if not student_id:
        raise HTTPException(status_code=400, detail="Student identity not resolved")

    now = datetime.now()
    
    try:
        # =========================
        # DEBUG: Check if student exists
        # =========================
        student = db.query(StudentInfo).filter(StudentInfo.StudentID == student_id).first()
        print(f"[DEBUG] Student found: {student is not None}")
        if not student:
            print(f"[ERROR] Student not found with ID: {student_id}")
        
        # =========================
        # 1. FIND OR CREATE SESSION
        # =========================
        print(f"[DEBUG] Looking for existing session...")
        active_session = db.query(StudySession).filter(
            StudySession.StudentID == student_id,
            StudySession.STBID == request.textbookId,
            StudySession.STBChapterID == request.chapterId,
            StudySession.EndedAt.is_(None)
        ).order_by(StudySession.StartedAt.desc()).first()
        
        print(f"[DEBUG] Existing session found: {active_session is not None}")
        
        if not active_session:
            print(f"[DEBUG] Creating new study session...")
            active_session = StudySession(
                StudentID=student_id,
                STBID=request.textbookId,
                STBChapterID=request.chapterId,
                StartedAt=now,
                CreatedAt=now
            )
            db.add(active_session)
            print(f"[DEBUG] Session added to session. About to flush...")
            db.flush()
            print(f"[DEBUG] Session created with ID: {active_session.StdySessionID}")
        else:
            print(f"[DEBUG] Using existing session ID: {active_session.StdySessionID}")
        
        # =========================
        # 2. PROGRESS HANDLING
        # =========================
        print(f"[DEBUG] Looking for existing progress record...")
        existing_progress = db.query(StuSectionProgress).filter(
            StuSectionProgress.StudentID == student_id,
            StuSectionProgress.STBID == request.textbookId,
            StuSectionProgress.STBChapterID == request.chapterId,
            StuSectionProgress.STBSectionID == request.sectionId
        ).first()
        
        print(f"[DEBUG] Existing progress: {existing_progress is not None}")
        
        if existing_progress:
            print(f"[DEBUG] Updating existing progress record...")
            existing_progress.IsCompleted = True
            existing_progress.LastAccessed = now
            existing_progress.TimeSpentSeconds = request.timeSpentSeconds
            existing_progress.StdySessionID = active_session.StdySessionID
            print(f"[DEBUG] Progress updated")
        else:
            print(f"[DEBUG] Creating new progress record...")
            new_progress = StuSectionProgress(
                StudentID=student_id,
                STBID=request.textbookId,
                STBChapterID=request.chapterId,
                STBSectionID=request.sectionId,
                IsCompleted=True,
                LastAccessed=now,
                TimeSpentSeconds=request.timeSpentSeconds,
                StdySessionID=active_session.StdySessionID,
                CreatedAt=now
            )
            db.add(new_progress)
            print(f"[DEBUG] New progress record added to session")
        
        # =========================
        # 3. UPDATE SESSION PAGES
        # =========================
        print(f"[DEBUG] Updating session pages...")
        if active_session.PagesCovered:
            if request.sectionId not in active_session.PagesCovered:
                active_session.PagesCovered = f"{active_session.PagesCovered}, Section {request.sectionId}"
        else:
            active_session.PagesCovered = f"Section {request.sectionId}"
        print(f"[DEBUG] PagesCovered: {active_session.PagesCovered}")
        
        # =========================
        # 4. COMMIT
        # =========================
        print(f"[DEBUG] Committing to database...")
        db.commit()
        print(f"[DEBUG] COMMIT SUCCESSFUL!")
        
        # =========================
        # 5. VERIFY - Query back to confirm
        # =========================
        print(f"[DEBUG] Verifying save...")
        verify_progress = db.query(StuSectionProgress).filter(
            StuSectionProgress.StudentID == student_id,
            StuSectionProgress.STBID == request.textbookId,
            StuSectionProgress.STBChapterID == request.chapterId,
            StuSectionProgress.STBSectionID == request.sectionId
        ).first()
        
        if verify_progress:
            print(f"[DEBUG] VERIFICATION: Progress record EXISTS!")
            print(f"[DEBUG]   IsCompleted: {verify_progress.IsCompleted}")
            print(f"[DEBUG]   StdySessionID: {verify_progress.StdySessionID}")
        else:
            print(f"[DEBUG] VERIFICATION: Progress record DOES NOT EXIST after commit!")
        
        return {
            "success": True,
            "message": "Section marked as completed",
            "sessionId": active_session.StdySessionID
        }
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Exception occurred!")
        print(f"[ERROR] Type: {type(e).__name__}")
        print(f"[ERROR] Message: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")