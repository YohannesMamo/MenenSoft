from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.Question import Question
from models.QuestionOption import QuestionOption

router = APIRouter()

@router.get("/api/questions")
def get_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).all()
    return questions

@router.get("/api/questions/{question_id}")
def get_question(question_id: str, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.QuestionID == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    options = db.query(QuestionOption).filter(QuestionOption.QuestionID == question_id).all()
    return {"question": question, "options": options}