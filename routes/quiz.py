from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.Quiz import Quiz
from models.QuizOption import QuizOption
from routes.auth import get_current_user, user

router = APIRouter()

@router.get("/")
async def get_quizzes(db: Session = Depends(get_db), current_user: user = Depends(get_current_user)):
    quizzes = db.query(Quiz).all()
    return quizzes

@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str, db: Session = Depends(get_db), current_user: user = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.QuizID == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.get("/{quiz_id}/options")
async def get_quiz_options(quiz_id: str, db: Session = Depends(get_db), current_user: user = Depends(get_current_user)):
    options = db.query(QuizOption).filter(QuizOption.QuizID == quiz_id).all()
    return options