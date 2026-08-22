from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer  # ← IMPORT THIS
from sqlalchemy.orm import Session
from sqlalchemy import and_
from database import get_db
from models.ExamSession import ExamSession
from models.StuQuAnswer import StuQuAnswer
from models.Question import Question
from models.QuestionOption import QuestionOption
from models.StudentInfo import StudentInfo
from models.user import user
from routes.auth import get_current_user
from routes.students import get_current_user_id
from datetime import datetime
from typing import List
from pydantic import BaseModel
import logging
import uuid
import random

router = APIRouter()
logger = logging.getLogger(__name__)

# ← THIS WAS MISSING
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# Now get_student_id will work
def get_student_id(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    user_id = get_current_user_id(token=token, db=db)
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student.StudentID

# Store questions per session in memory for demo (in production, use Redis or DB)
session_questions = {}
session_current_index = {}
session_scores = {}
session_correct_count = {}  # Track number of correct answers per session

class ExamStartRequest(BaseModel):
    textbookId: str
    chapterId: int | None = None
    sectionId: str | None = None

class ExamAnswerRequest(BaseModel):
    sessionId: str
    questionId: str
    answer: str
    selectedOption: str | None = None
    responseTimeSeconds: int = 0

class ExamSubmitRequest(BaseModel):
    sessionId: str

@router.post("/api/exams/start")
def start_exam(request: ExamStartRequest, db: Session = Depends(get_db), student_id: str = Depends(get_student_id)):
    print(f"[Exams API] /api/exams/start called for student: {student_id}")
    print(f"[Exams API] Request body: textbookId={request.textbookId}, chapterId={request.chapterId}, sectionId={request.sectionId}")
    print(f"[Exams API] Type of chapterId: {type(request.chapterId)}")
    
    # Get questions from Question table (EXAMS ONLY - NOT quizzes!)
    questions_data = []
    
    # Normalize sectionId - convert empty string to None
    section_id = request.sectionId if request.sectionId and request.sectionId.strip() else None
    
    # Use Question table ONLY for exams
    question_query = db.query(Question).filter(Question.QSTBID == request.textbookId)
    
    # Debug: Check if chapterId is valid before filtering
    if request.chapterId and request.chapterId > 0:
        print(f"[Exams API] Filtering by chapterId: {request.chapterId}")
        question_query = question_query.filter(Question.QChapterID == request.chapterId)
    else:
        print(f"[Exams API] Not filtering by chapterId (value: {request.chapterId})")
        
    if section_id:
        print(f"[Exams API] Filtering by sectionId: {section_id}")
        question_query = question_query.filter(Question.QSectionID == section_id)
    else:
        print(f"[Exams API] Not filtering by sectionId")
    
    questions = question_query.all()
    print(f"[Exams API] Found {len(questions)} questions in Question table for {request.textbookId} (chapter: {request.chapterId}, section: {section_id})")
    
    # Debug: Show sample question if found
    if questions:
        print(f"[Exams API] First question ID: {questions[0].QuestionID}")
        print(f"[Exams API] First question text preview: {str(questions[0].QText)[:50]}...")
    
    # Shuffle questions to prevent guessing from previous attempts
    random.shuffle(questions)
    
    for q in questions:
        options = db.query(QuestionOption).filter(QuestionOption.QuestionID == q.QuestionID).all()
        # Shuffle options within each question
        random.shuffle(options)
        print(f"[Exams API] Question {q.QuestionID} has {len(options)} options")
        questions_data.append({
            "questionID": q.QuestionID,
            "qText": q.QText,
            "qPoints": float(q.QPoints) if q.QPoints else 10,
            "qExplanation": q.QExplanation or "",
            "options": [
                {
                    "optionLabel": o.OptionLabel,
                    "optionText": o.OptionText,
                    "opExplanation": o.OpExplanation or "",
                    "iCorrect": o.IsCorrect or False,
                    "dOrder": o.DisplayOrder or 0
                } for o in options
            ]
        })
    
    if not questions_data:
        raise HTTPException(status_code=404, detail="No exam questions found")
    
    # Count previous attempts for this student+section
    attempt_count = db.query(ExamSession).filter(
        ExamSession.StudentID == student_id,
        ExamSession.STBID == request.textbookId,
        ExamSession.SectionID == section_id
    ).count()
    current_attempt = attempt_count + 1
    print(f"[Exams API] Attempt #{current_attempt} for student {student_id} on section {section_id}")
    
    # Create ExamSession
    session_id = str(uuid.uuid4())
    session = ExamSession(
        SessionID=session_id,
        StudentID=student_id,  # Use actual student ID from token
        STBID=request.textbookId,
        ChapterID=request.chapterId,
        SectionID=section_id,
        SessionType="Practice",
        StartedAt=datetime.now(),
        TotalQuestions=len(questions_data),
        TimeSpentSeconds=0,
        AttemptNumber=current_attempt
    )
    db.add(session)
    db.commit()
    
    # Store questions in memory
    session_questions[session_id] = questions_data
    session_current_index[session_id] = 0
    session_scores[session_id] = 0
    session_correct_count[session_id] = 0
    
    print(f"[Exams API] Created session: {session_id} with {len(questions_data)} questions (attempt #{current_attempt})")
    print(f"[Exams API] First question: {questions_data[0] if questions_data else 'N/A'}")
    
    return {
        "sessionId": session_id,
        "attemptNumber": current_attempt
    }

@router.get("/api/exams")
def get_exams(textbookId: str | None = None, db: Session = Depends(get_db)):
    return []

@router.get("/api/exams/next/{session_id}")
def get_next_question(session_id: str, db: Session = Depends(get_db)):
    print(f"[Exams API] /api/exams/next/{session_id} called")
    print(f"[Exams API] Session IDs in memory: {list(session_questions.keys())}")
    print(f"[Exams API] Session exists in memory: {session_id in session_questions}")
    
    # Check if session exists in memory
    if session_id not in session_questions:
        print(f"[Exams API] Session {session_id} not found in session_questions, reloading from database")
        
        # Try to reload from database
        session = db.query(ExamSession).filter(ExamSession.SessionID == session_id).first()
        
        if not session:
            print(f"[Exams API] Session {session_id} not found in database")
            return {"message": "No more questions"}
        
        # Reload questions from database
        question_query = db.query(Question).filter(Question.QSTBID == session.STBID)
        if session.ChapterID:
            question_query = question_query.filter(Question.QChapterID == session.ChapterID)
        if session.SectionID:
            question_query = question_query.filter(Question.QSectionID == session.SectionID)
        
        questions = question_query.all()
        questions_data = []
        
        # Shuffle questions when reloading from database
        random.shuffle(questions)
        
        for q in questions:
            options = db.query(QuestionOption).filter(QuestionOption.QuestionID == q.QuestionID).all()
            # Shuffle options within each question
            random.shuffle(options)
            questions_data.append({
                "questionID": q.QuestionID,
                "qText": q.QText,
                "qPoints": float(q.QPoints) if q.QPoints else 10,
                "qExplanation": q.QExplanation or "",
                "options": [
                    {
                        "optionLabel": o.OptionLabel,
                        "optionText": o.OptionText,
                        "opExplanation": o.OpExplanation or "",
                        "iCorrect": o.IsCorrect or False,
                        "dOrder": o.DisplayOrder or 0
                    } for o in options
                ]
            })
        
        if not questions_data:
            print(f"[Exams API] No questions found for session {session_id}")
            return {"message": "No more questions"}
        
        # Store in memory
        session_questions[session_id] = questions_data
        session_current_index[session_id] = 0
        session_scores[session_id] = 0
        print(f"[Exams API] Reloaded {len(questions_data)} questions for session {session_id}")
    
    questions = session_questions[session_id]
    current_idx = session_current_index[session_id]
    print(f"[Exams API] Current index: {current_idx}, total questions: {len(questions)}")
    
    # Check if questions list is empty
    if not questions:
        print(f"[Exams API] Questions list is empty for session {session_id}")
        return {"message": "No questions available for this exam"}
    
    if current_idx >= len(questions):
        print(f"[Exams API] No more questions")
        return {"message": "No more questions"}
    
    question = questions[current_idx]
    session_current_index[session_id] = current_idx + 1
    is_last = current_idx == len(questions) - 1
    print(f"[Exams API] Returning question {current_idx+1}/{len(questions)}")
    
    return {
        **question,
        "isLastQuestion": is_last
    }

@router.post("/api/exams/answer")
def submit_answer(request: ExamAnswerRequest, db: Session = Depends(get_db)):
    print(f"[Exams API] /api/exams/answer called for question {request.questionId}")
    
    session_id = request.sessionId
    selected = request.selectedOption or request.answer
    
    # Get correct answer from QuestionOption (EXAMS ONLY)
    question = db.query(Question).filter(Question.QuestionID == request.questionId).first()
    correct_option = None
    explanation = ""
    is_correct = False
    
    if question:
        options = db.query(QuestionOption).filter(QuestionOption.QuestionID == request.questionId).all()
        correct_option = next((o for o in options if o.IsCorrect), None)
        explanation = question.QExplanation or ""
        if correct_option:
            is_correct = selected == correct_option.OptionLabel
            if is_correct and session_id in session_scores:
                session_scores[session_id] += float(question.QPoints or 10)
    else:
        print(f"[Exams API] Question {request.questionId} not found")
    
    current_idx = session_current_index.get(session_id, 0)
    total_questions = len(session_questions.get(session_id, []))
    is_last = current_idx >= total_questions
    
    return {
        "correct": is_correct,
        "correctAnswer": correct_option.OptionLabel if correct_option else "",
        "explanation": explanation,
        "totalScoreSoFar": session_scores.get(session_id, 0),
        "isLastQuestion": is_last,
        "answeredQuestions": current_idx,
        "totalQuestions": total_questions
    }

@router.post("/api/exams/submitAnswer")
def submit_exam_answer(request: dict, db: Session = Depends(get_db)):
    session_id = request.get("sessionId")
    question_id = request.get("questionId")
    selected_option = request.get("selectedOption")
    
    print(f"[Exams API] /api/exams/submitAnswer called for session {session_id}, question {question_id}")
    
    if not session_id or not question_id or not selected_option:
        return {"error": "Missing required fields"}
    
    # Get correct answer from QuestionOption
    question = db.query(Question).filter(Question.QuestionID == question_id).first()
    correct_option = None
    explanation = ""
    is_correct = False
    
    if question:
        options = db.query(QuestionOption).filter(QuestionOption.QuestionID == question_id).all()
        correct_option = next((o for o in options if o.IsCorrect), None)
        explanation = question.QExplanation or ""
        if correct_option:
            is_correct = selected_option == correct_option.OptionLabel
            if is_correct and session_id in session_scores:
                session_scores[session_id] += float(question.QPoints or 10)
                session_correct_count[session_id] = session_correct_count.get(session_id, 0) + 1
                print(f"[Exams API] Correct answer! Score increased by {question.QPoints or 10}")
    else:
        print(f"[Exams API] Question {question_id} not found")
    
    current_idx = session_current_index.get(session_id, 0)
    total_questions = len(session_questions.get(session_id, []))
    is_last = current_idx >= total_questions
    
    print(f"[Exams API] Submit answer result - correct: {is_correct}, score: {session_scores.get(session_id, 0)}, isLast: {is_last}")
    
    return {
        "correct": is_correct,
        "correctAnswer": correct_option.OptionLabel if correct_option else "",
        "explanation": explanation,
        "totalScoreSoFar": session_scores.get(session_id, 0),
        "isLastQuestion": is_last,
        "answeredQuestions": current_idx,
        "totalQuestions": total_questions
    }

@router.post("/api/exams/finish")
def finish_exam(request: ExamSubmitRequest, db: Session = Depends(get_db)):
    session = db.query(ExamSession).filter(ExamSession.SessionID == request.sessionId).first()
    total_score = session_scores.get(request.sessionId, 0)
    questions = session_questions.get(request.sessionId, [])
    total_questions = len(questions)
    
    # Calculate total possible points by summing QPoints from all questions
    total_possible_points = sum(float(q.get('qPoints', 10)) for q in questions) if questions else 0
    
    # Calculate percentage correctly
    percentage = int((total_score / total_possible_points) * 100) if total_possible_points > 0 else 0
    message = "Great job!" if percentage >= 80 else "Good effort!"
    
    if session:
        session.CompletedAt = datetime.now()
        session.OverallScore = total_score
        db.commit()
    
    print(f"[Exams API] Finish exam - Score: {total_score}, Total Possible: {total_possible_points}, Percentage: {percentage}%")
    
    # Get actual number of correct answers
    correct_answers = session_correct_count.get(request.sessionId, 0)
    
    return {
        "score": total_score,
        "totalScore": total_score,
        "totalQuestions": total_questions,
        "totalPossiblePoints": total_possible_points,
        "percentage": percentage,
        "message": message,
        "correct": correct_answers,
        "correctAnswers": correct_answers,
        "attemptNumber": session.AttemptNumber if session else 1
    }

@router.get("/api/exams/question-count")
def get_question_count(textbookId: str, sectionId: str | None = None, db: Session = Depends(get_db)):
    # Use Question table for exams
    query = db.query(Question).filter(Question.QSTBID == textbookId)
    if sectionId:
        query = query.filter(Question.QSectionID == sectionId)
    count = query.count()
    return {"count": count if count > 0 else 10}

@router.get("/api/exams/questions/{session_id}")
def get_exam_questions(session_id: str, db: Session = Depends(get_db)):
    print(f"[Exams API] /api/exams/questions/{session_id} called")
    
    # Get the session to know which textbook/chapter/section we're dealing with
    session = db.query(ExamSession).filter(ExamSession.SessionID == session_id).first()
    
    # Build query based on session info - using Question table ONLY
    query = db.query(Question)
    if session:
        print(f"[Exams API] Session found: STBID={session.STBID}, ChapterID={session.ChapterID}, SectionID={session.SectionID}")
        query = query.filter(Question.QSTBID == session.STBID)
        if session.ChapterID:
            query = query.filter(Question.QChapterID == session.ChapterID)
        if session.SectionID:
            query = query.filter(Question.QSectionID == session.SectionID)
    
    questions = query.all()
    print(f"[Exams API] Found {len(questions)} questions")
    
    # Shuffle questions to prevent guessing from previous attempts
    random.shuffle(questions)
    
    # Get options for each question
    result = []
    for q in questions:
        options = db.query(QuestionOption).filter(QuestionOption.QuestionID == q.QuestionID).order_by(QuestionOption.DisplayOrder).all()
        # Shuffle options within each question
        random.shuffle(options)
        result.append({
            "questionID": q.QuestionID,
            "qText": q.QText,
            "qPoints": float(q.QPoints) if q.QPoints else 10,
            "options": [
                {
                    "optionLabel": o.OptionLabel,
                    "optionText": o.OptionText,
                    "opExplanation": o.OpExplanation or "",
                    "iCorrect": o.IsCorrect or False,
                    "dOrder": o.DisplayOrder or 0
                } for o in options
            ]
        })
    
    return {"questions": result}

class AnswerItem(BaseModel):
    questionId: str
    selectedOption: str
    responseTimeSeconds: int

class ExamSubmitRequest(BaseModel):
    sessionId: str
    answers: List[AnswerItem]
    timeSpentSeconds: int

@router.post("/api/exams/submit")
async def submit_exam(
    request: ExamSubmitRequest,
    current_user: user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Get student ID from current user
        student_info = db.query(StudentInfo).filter(
            StudentInfo.UserID == current_user.UserID
        ).first()
        
        if not student_info:
            return JSONResponse(
                status_code=401,
                content={"message": "Authentication required"}
            )
        
        student_id = student_info.StudentID
        
        # Begin transaction
        session = db.query(ExamSession).filter(
            ExamSession.SessionID == request.sessionId,
            ExamSession.StudentID == student_id
        ).first()
        
        if not session:
            return JSONResponse(
                status_code=404,
                content={"message": "Exam session not found"}
            )
        
        # Handle resubmission (reset if already completed)
        if session.CompletedAt:
            session.CompletedAt = None
            session.OverallScore = None
            session.CorrectAnswers = 0
            session.WrongAnswers = 0
            session.TimeSpentSeconds = 0
            # Optional: Clear old answers
            # db.query(StuQuAnswer).filter(
            #     StuQuAnswer.SessionID == session.SessionID
            # ).delete()
        
        total_score = 0.0
        correct_count = 0
        incorrect_count = 0
        max_possible_score = 0.0
        answer_results = []
        
        for answer in request.answers:
            # Get question with options
            question = db.query(Question).filter(
                Question.QuestionID == answer.questionId
            ).first()
            
            if not question:
                continue
            
            # Find correct option
            correct_opt = db.query(QuestionOption).filter(
                and_(
                    QuestionOption.QuestionID == question.QuestionID,
                    QuestionOption.IsCorrect == True
                )
            ).first()
            
            if not correct_opt:
                continue
            
            # Check if answer is correct
            is_correct = (answer.selectedOption.strip().upper() == 
                         correct_opt.OptionLabel.strip().upper())
            
            question_points = float(question.QPoints) if question.QPoints is not None else 10.0
            max_possible_score += question_points
            points_earned = question_points if is_correct else 0.0
            
            total_score += points_earned
            if is_correct:
                correct_count += 1
            else:
                incorrect_count += 1
            
            # Find user's selected option details
            user_opt = db.query(QuestionOption).filter(
                and_(
                    QuestionOption.QuestionID == question.QuestionID,
                    QuestionOption.OptionLabel == answer.selectedOption
                )
            ).first()
            
            # UPSERT answer
            existing_answer = db.query(StuQuAnswer).filter(
                and_(
                    StuQuAnswer.SessionID == session.SessionID,
                    StuQuAnswer.QuestionID == answer.questionId,
                    StuQuAnswer.StudentID == student_id
                )
            ).first()
            
            if existing_answer:
                existing_answer.SQUAnswer = answer.selectedOption
                existing_answer.AnsweredAt = datetime.utcnow()
                existing_answer.IsCorrect = is_correct
                existing_answer.ResponseTimeSeconds = answer.responseTimeSeconds
                existing_answer.SQUPoints = int(points_earned)
            else:
                new_answer = StuQuAnswer(
                    SessionID=session.SessionID,
                    QuestionID=answer.questionId,
                    StudentID=student_id,
                    SQUAnswer=answer.selectedOption,
                    AnsweredAt=datetime.utcnow(),
                    IsCorrect=is_correct,
                    ResponseTimeSeconds=answer.responseTimeSeconds,
                    SQUPoints=int(points_earned)
                )
                db.add(new_answer)
            
            answer_results.append({
                "questionId": answer.questionId,
                "questionText": question.QText,
                "yourAnswer": answer.selectedOption,
                "yourAnswerText": user_opt.OptionText if user_opt else "",
                "yourAnswerExplanation": user_opt.OpExplanation if user_opt else "",
                "isCorrect": is_correct,
                "pointsEarned": points_earned,
                "maxPoints": question_points,
                "correctAnswer": correct_opt.OptionLabel,
                "correctAnswerText": correct_opt.OptionText,
                "correctAnswerExplanation": correct_opt.OpExplanation or question.QExplanation or ""
            })
        
        # Calculate percentage
        percentage = round((total_score / max_possible_score * 100), 1) if max_possible_score > 0 else 0
        
        # Update session
        session.CompletedAt = datetime.utcnow()
        session.EndedAt = datetime.utcnow()
        session.OverallScore = total_score
        session.TotalQuestions = len(request.answers)
        session.CorrectAnswers = correct_count
        session.WrongAnswers = incorrect_count
        session.TimeSpentSeconds = request.timeSpentSeconds
        
        db.commit()
        
        # Generate message based on percentage
        if percentage >= 90:
            message = "Excellent performance! Outstanding!"
        elif percentage >= 70:
            message = "Great job! Well done."
        elif percentage >= 50:
            message = "Good effort! Keep improving."
        else:
            message = "Keep practicing. Better luck next time."
        
        return {
            "sessionId": str(session.SessionID),
            "totalQuestions": len(request.answers),
            "correctCount": correct_count,
            "incorrectCount": incorrect_count,
            "totalScore": total_score,
            "maxPossibleScore": max_possible_score,
            "percentage": percentage,
            "performanceLevel": "Passed" if percentage >= 70 else "Failed",
            "attemptNumber": session.AttemptNumber or 1,
            "timeSpent": {
                "seconds": request.timeSpentSeconds,
                "formatted": f"{request.timeSpentSeconds // 60}:{(request.timeSpentSeconds % 60):02d}"
            },
            "message": message,
            "results": answer_results
        }
        
    except Exception as e:
        db.rollback()
        print(f"SubmitExam Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"message": "Failed to submit exam. Please try again."}
        )