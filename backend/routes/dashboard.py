from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc
from database import get_db
from models.StudentInfo import StudentInfo
from models.STextBook import STextBook
from models.StuSectionProgress import StuSectionProgress
from models.SubjectsInfo import SubjectsInfo
from models.QuizSession import QuizSession
from models.ExamSession import ExamSession
from models.StuQzAnswer import StuQzAnswer
from models.user import user as userModel

router = APIRouter()

from core.config import settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def get_current_user_id(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user_record = db.query(userModel).filter(userModel.UserID == user_id).first()
        if not user_record or not user_record.is_active:
            raise HTTPException(status_code=401, detail="User not found or deactivated")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

@router.get("/api/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    try:
        print(f"[Dashboard] User ID: {user_id}")
        
        student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        grade = student.StuGrade
        print(f"[Dashboard] Student ID: {student.StudentID}, Grade: {grade}")

        all_books = db.query(STextBook).outerjoin(
            SubjectsInfo, STextBook.STBSubjectID == SubjectsInfo.SubjectID
        ).filter(STextBook.STBGradeID == grade).all()
        print(f"[Dashboard] Found {len(all_books)} textbooks")

        # Get progress records
        progress_records = db.query(StuSectionProgress).filter(
            StuSectionProgress.StudentID == student.StudentID
        ).all()
        print(f"[Dashboard] Found {len(progress_records)} progress records")

        # Calculate total sections across all textbooks using SectionCount from textbook table
        total_all_sections = sum(book.SectionCount for book in all_books if book.SectionCount)
        completed_sections_total = sum(1 for p in progress_records if p.IsCompleted)
        
        # Calculate overall progress
        overall_progress = round((completed_sections_total / max(total_all_sections, 1)) * 100, 1)
        print(f"[Dashboard] Total sections: {total_all_sections}, Completed: {completed_sections_total}, Progress: {overall_progress}%")

        quiz_sessions = db.query(QuizSession).filter(
            QuizSession.StudentID == student.StudentID,
            QuizSession.CompletedAt != None
        ).all()
        print(f"[Dashboard] Found {len(quiz_sessions)} quiz sessions")

        exam_sessions = db.query(ExamSession).filter(
            ExamSession.StudentID == student.StudentID,
            ExamSession.CompletedAt != None
        ).all()
        print(f"[Dashboard] Found {len(exam_sessions)} exam sessions")

        passing_threshold = 60

        # Calculate quizzes passed/failed correctly
        quizzes_passed = sum(1 for q in quiz_sessions 
                           if q.OverallScore is not None and q.TotalQuestions is not None 
                           and q.TotalQuestions > 0
                           and (float(q.OverallScore) / float(q.TotalQuestions) * 100) >= passing_threshold)
        quizzes_failed = len(quiz_sessions) - quizzes_passed
        
        # Calculate exams passed/failed correctly
        exams_passed = sum(1 for e in exam_sessions 
                         if e.OverallScore is not None and e.TotalQuestions is not None 
                         and e.TotalQuestions > 0
                         and (float(e.OverallScore) / float(e.TotalQuestions) * 100) >= passing_threshold)
        exams_failed = len(exam_sessions) - exams_passed

        # Build textbook progress using SectionCount from textbook table
        textbook_progress = []
        subject_ids = [book.STBSubjectID for book in all_books if book.STBSubjectID]
        subjects_map = {s.SubjectID: s for s in db.query(SubjectsInfo).filter(SubjectsInfo.SubjectID.in_(subject_ids)).all()} if subject_ids else {}
        
        for book in all_books:
            subject = subjects_map.get(book.STBSubjectID)
            
            # Get total sections from textbook's SectionCount column
            total_sections_in_book = book.SectionCount or 0
            
            # Get completed sections from progress records
            completed_count = sum(1 for p in progress_records 
                                 if p.STBID == book.STBID and p.IsCompleted)
            
            # Debug output
            print(f"[DEBUG] Book: {book.STBID}, SectionCount: {total_sections_in_book}, Completed: {completed_count}")
            
            # Calculate progress percentage
            if total_sections_in_book > 0:
                progress_pct = round((completed_count / total_sections_in_book) * 100, 1)
            else:
                progress_pct = 0

            textbook_progress.append({
                "stbId": book.STBID,
                "subjectName": subject.SubjectDescription if subject else "Unknown",
                "completed": completed_count,
                "total": total_sections_in_book,
                "progressPercentage": progress_pct,
                "textbookTitle": book.STBTitle if hasattr(book, 'STBTitle') else book.STBID
            })

        textbook_progress.sort(key=lambda x: x["progressPercentage"], reverse=True)

        recent_sessions = db.query(QuizSession).filter(
            QuizSession.StudentID == student.StudentID,
            QuizSession.CompletedAt != None
        ).order_by(desc(QuizSession.CompletedAt)).limit(5).all()

        recent_quizzes_data = []
        for s in recent_sessions:
            try:
                if s.OverallScore and s.TotalQuestions and s.TotalQuestions > 0:
                    score_percentage = (float(s.OverallScore) / float(s.TotalQuestions)) * 100
                else:
                    score_percentage = 0
                    
                recent_quizzes_data.append({
                    "sessionId": str(s.SessionID),
                    "completedAt": str(s.CompletedAt) if s.CompletedAt else None,
                    "score": score_percentage,
                    "totalQuestions": s.TotalQuestions or 0
                })
            except Exception as e:
                print(f"[Dashboard] Error: {e}")
                recent_quizzes_data.append({
                    "sessionId": str(s.SessionID),
                    "completedAt": str(s.CompletedAt) if s.CompletedAt else None,
                    "score": 0,
                    "totalQuestions": 0
                })

        recommended_sub = next((x['subjectName'] for x in textbook_progress if x['progressPercentage'] < 100), None)

        return {
            "student": {
                "studentId": student.StudentID,
                "fullName": f"{student.StuFirstName} {student.StuLastName}".strip(),
                "gradeLevel": grade
            },
            "overview": {
                "overallProgress": overall_progress,
                "completedSections": completed_sections_total,
                "totalSections": total_all_sections,
                "quizzesPassed": quizzes_passed,
                "quizzesFailed": quizzes_failed,
                "examsPassed": exams_passed,
                "examsFailed": exams_failed
            },
            "textbookProgress": textbook_progress,
            "recentQuizzes": recent_quizzes_data,
            "recommendedAction": f"Continue studying {recommended_sub}" if recommended_sub else "All caught up! Review your recent quizzes.",
            "motivationalMessage": "Great job! Keep building on your progress." if overall_progress > 20 else "Every small step counts. You've got this!"
        }
        
    except HTTPException:
        raise
        
    except Exception as e:
        print(f"[Dashboard ERROR] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")