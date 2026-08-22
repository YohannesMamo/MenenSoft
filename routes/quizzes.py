from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from database import get_db
from models.Quiz import Quiz
from models.QuizOption import QuizOption
from models.QuizSession import QuizSession
from models.StuQzAnswer import StuQzAnswer
from models.StudentInfo import StudentInfo
from fastapi.security import OAuth2PasswordBearer
import uuid
import random
from datetime import datetime

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

def get_student_id(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    from routes.students import get_current_user_id
    user_id = get_current_user_id(token=token, db=db)
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student.StudentID

class QuizStartRequest(BaseModel):
    quizID: str | None = None
    textbookId: str | None = None
    chapterId: int | None = None
    sectionId: str | None = None

class QuizAnswer(BaseModel):
    questionId: str
    selectedOption: str
    responseTimeSeconds: int = 0

class QuizSubmitRequest(BaseModel):
    sessionId: str
    answers: List[QuizAnswer]
    timeSpentSeconds: int

@router.get("/api/quizzes")
def get_quizzes(textbookId: str | None = None, chapterId: int | None = None, sectionId: str | None = None, db: Session = Depends(get_db)):
    print(f"[Quizzes API] /api/quizzes called with textbookId={textbookId}, chapterId={chapterId}, sectionId={sectionId}")
    query = db.query(Quiz)
    if textbookId:
        query = query.filter(Quiz.QzSTBID == textbookId)
    if chapterId:
        query = query.filter(Quiz.QzChapterID == chapterId)
    if sectionId:
        query = query.filter(Quiz.QzSectionID == sectionId)
    quizzes = query.all()
    print(f"[Quizzes API] Found {len(quizzes)} quizzes for this selection")
    if quizzes:
        quiz = quizzes[0]
        print(f"[Quizzes API] Found quiz: {quiz.QuizID}")
        return {"hasQuiz": True, "quiz": {"quizID": quiz.QuizID, "title": quiz.QzText}}
    print(f"[Quizzes API] No quiz found")
    return {"hasQuiz": False, "message": "No quiz available for this section"}

@router.get("/api/quizzes/{quiz_id}")
def get_quiz(quiz_id: str, db: Session = Depends(get_db)):
    quiz = db.query(Quiz).filter(Quiz.QuizID == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    options = db.query(QuizOption).filter(QuizOption.QuizID == quiz_id).all()
    return {"quiz": quiz, "options": options}

@router.post("/api/quizzes/start")
def start_quiz(request: QuizStartRequest, db: Session = Depends(get_db), student_id: str = Depends(get_student_id)):
    print(f"[Quizzes API] /api/quizzes/start called for student: {student_id}")
    print(f"[Quizzes API] Request body: quizID={request.quizID}, textbookId={request.textbookId}, chapterId={request.chapterId}, sectionId={request.sectionId}")
    
    # Build query to get ALL questions for this section
    # Note: We do NOT filter by quizID when getting questions
    # Each row in Quizzes table is ONE question, so we want ALL matching questions
    query = db.query(Quiz)
    if request.textbookId:
        query = query.filter(Quiz.QzSTBID == request.textbookId)
        print(f"[Quizzes API] Filtered by QzSTBID={request.textbookId}")
    if request.chapterId:
        query = query.filter(Quiz.QzChapterID == request.chapterId)
        print(f"[Quizzes API] Filtered by QzChapterID={request.chapterId}")
    if request.sectionId:
        query = query.filter(Quiz.QzSectionID == request.sectionId)
        print(f"[Quizzes API] Filtered by QzSectionID={request.sectionId}")
    # Do NOT filter by quizID when getting questions - we want ALL questions for the section!
    
    quizzes = query.all()
    print(f"[Quizzes API] Query returned {len(quizzes)} quizzes (questions)")
    
    if not quizzes:
        raise HTTPException(status_code=404, detail="No questions found for this section")
    
    # Count previous attempts for this student+section to log attempt number
    attempt_count = db.query(QuizSession).filter(
        QuizSession.StudentID == student_id,
        QuizSession.STBID == request.textbookId,
        QuizSession.SectionID == request.sectionId
    ).count()
    current_attempt = attempt_count + 1
    print(f"[Quizzes API] Attempt #{current_attempt} for student {student_id} on section {request.sectionId}")
    
    # Get the first quiz to extract metadata
    first_quiz = quizzes[0]
    
    # Shuffle questions to prevent guessing from previous attempts
    random.shuffle(quizzes)
    
    # Create a QuizSession
    session_id = str(uuid.uuid4())
    session = QuizSession(
        SessionID=session_id,
        StudentID=student_id,  # Use actual student ID from token
        ChapterID=first_quiz.QzChapterID,
        SectionID=first_quiz.QzSectionID,
        STBID=first_quiz.QzSTBID,
        SessionType="Quiz",
        StartedAt=datetime.now(),
        TotalQuestions=len(quizzes),
        TimeSpentSeconds=0,
        AttemptNumber=current_attempt
    )
    db.add(session)
    db.commit()
    
    print(f"[Quizzes API] Created session: {session_id} with {len(quizzes)} questions (attempt #{current_attempt})")
    
    # Format all questions properly - shuffle options within each question
    questions = []
    for quiz in quizzes:
        options = db.query(QuizOption).filter(QuizOption.QuizID == quiz.QuizID).all()
        # Shuffle options so correct answer position changes between attempts
        random.shuffle(options)
        questions.append({
            "questionId": quiz.QuizID,
            "text": quiz.QzText,
            "points": float(quiz.QzPoints) if quiz.QzPoints else 10,
            "difficulty": quiz.QzDifficulty or "Medium",
            "options": [{"label": o.OptionLabel, "text": o.OptionText} for o in options]
        })
    
    return {
        "sessionId": session_id,
        "questions": questions,
        "timeLimitMinutes": first_quiz.TimeLimitMinutes,
        "attemptNumber": current_attempt
    }

@router.post("/api/quizzes/submit")
def submit_quiz(request: QuizSubmitRequest, db: Session = Depends(get_db)):
    print(f"[Quizzes API] /api/quizzes/submit called with sessionId: {request.sessionId}")
    
    session = db.query(QuizSession).filter(QuizSession.SessionID == request.sessionId).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Evaluate answers
    total_questions = len(request.answers)
    correct_count = 0
    results = []
    total_score = 0
    
    for answer in request.answers:
        # Get the quiz/question for THIS specific answer
        print(f"[Quizzes API] Processing answer for questionId: {answer.questionId}, selectedOption: {answer.selectedOption}")
        quiz = db.query(Quiz).filter(Quiz.QuizID == answer.questionId).first()
        if not quiz:
            print(f"[Quizzes API] Quiz not found for questionId: {answer.questionId}")
            continue
        
        print(f"[Quizzes API] Found quiz: {quiz.QuizID}, QzText: {quiz.QzText[:50]}...")
        options = db.query(QuizOption).filter(QuizOption.QuizID == quiz.QuizID).all()
        print(f"[Quizzes API] Found {len(options)} options for quiz {quiz.QuizID}")
        for opt in options:
            print(f"[Quizzes API]   Option: {opt.OptionLabel} - {opt.OptionText[:30]}... IsCorrect: {opt.IsCorrect}")
        
        # Try to find correct option by IsCorrect flag
        # Handle both boolean True and string "True"/"true"
        correct_option = next((o for o in options if o.IsCorrect is True or str(o.IsCorrect).lower() == 'true'), None)
        
        # If no IsCorrect flag set, try to find by OptionLabel = "A" as fallback
        if not correct_option and len(options) > 0:
            print(f"[Quizzes API] No option has IsCorrect=True, using first option as fallback")
            correct_option = options[0]
        
        print(f"[Quizzes API] Correct option found: {correct_option.OptionLabel if correct_option else 'NONE'}")
        
        question_text = quiz.QzText
        is_correct = False
        your_answer_text = ""
        your_answer_explanation = ""
        correct_answer_text = ""
        correct_answer_explanation = ""
        
        # Find user's selected option text and explanation
        selected_opt = next((o for o in options if o.OptionLabel == answer.selectedOption), None)
        if selected_opt:
            your_answer_text = selected_opt.OptionText
            your_answer_explanation = selected_opt.QzOpExplanation or ""
            # Handle both boolean True and string "True"/"true"
            if selected_opt.IsCorrect is True or str(selected_opt.IsCorrect).lower() == 'true':
                is_correct = True
                correct_count += 1
        
        # Find correct option text and explanation
        if correct_option:
            correct_answer_text = correct_option.OptionText
            correct_answer_explanation = correct_option.QzOpExplanation or ""
        
        points_earned = float(quiz.QzPoints) if is_correct else 0
        total_score += points_earned
        
        # Use option explanation if available, otherwise fall back to quiz explanation
        explanation = your_answer_explanation if your_answer_explanation else (quiz.QzExplanation or "")
        correct_explanation = correct_answer_explanation if correct_answer_explanation else (quiz.QzExplanation or "")
        
        results.append({
            "questionId": answer.questionId,
            "questionText": question_text,
            "yourAnswer": answer.selectedOption,
            "yourAnswerText": your_answer_text,
            "isCorrect": is_correct,
            "pointsEarned": points_earned,
            "maxPoints": float(quiz.QzPoints) if quiz.QzPoints else 10,
            "correctAnswer": correct_option.OptionLabel if correct_option else "",
            "correctAnswerText": correct_answer_text,
            "explanation": explanation,
            "correctExplanation": correct_explanation
        })
    
    # Update session
    session.CompletedAt = datetime.now()
    session.OverallScore = total_score
    session.TimeSpentSeconds = request.timeSpentSeconds
    db.commit()
    
    percentage = int((correct_count / total_questions) * 100) if total_questions > 0 else 0
    
    # Log individual answers to StuQzAnswer for metrics tracking
    for result in results:
        existing = db.query(StuQzAnswer).filter(
            StuQzAnswer.SessionID == session.SessionID,
            StuQzAnswer.QuizID == result["questionId"],
            StuQzAnswer.StudentID == session.StudentID
        ).first()
        
        if existing:
            existing.SQZAnswer = result["yourAnswer"]
            existing.SQZPoints = result["pointsEarned"]
            existing.IsCorrect = result["isCorrect"]
            existing.AnsweredAt = datetime.now()
        else:
            answer_record = StuQzAnswer(
                SQZAnswerID=str(uuid.uuid4())[:10],
                QuizID=result["questionId"],
                StudentID=session.StudentID,
                SQZAnswer=result["yourAnswer"],
                SQZPoints=result["pointsEarned"],
                IsCorrect=result["isCorrect"],
                AnsweredAt=datetime.now(),
                SessionID=session.SessionID,
                QuestionOrder=results.index(result)
            )
            db.add(answer_record)
    
    db.commit()
    print(f"[Quizzes API] Logged {len(results)} answers to StuQzAnswer for session {session.SessionID}")
    
    return {
        "sessionId": request.sessionId,
        "totalQuestions": total_questions,
        "correctCount": correct_count,
        "incorrectCount": total_questions - correct_count,
        "totalScore": total_score,
        "percentage": percentage,
        "performanceLevel": "Excellent" if percentage >= 80 else "Good" if percentage >= 60 else "Needs Improvement",
        "attemptNumber": session.AttemptNumber or 1,
        "timeSpent": {
            "seconds": request.timeSpentSeconds,
            "formatted": f"{request.timeSpentSeconds // 60}:{str(request.timeSpentSeconds % 60).zfill(2)}"
        },
        "results": results
    }

@router.get("/api/study/quiz/check/{stb_id}/{chapter_id}/{section_id}")
def check_quiz_available(stb_id: str, chapter_id: int, section_id: str, db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).filter(
        Quiz.QzSTBID == stb_id,
        Quiz.QzChapterID == chapter_id,
        Quiz.QzSectionID == section_id
    ).all()
    if quizzes:
        return {"hasQuiz": True, "quizId": quizzes[0].QuizID}
    return {"hasQuiz": False}