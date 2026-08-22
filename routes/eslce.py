"""
ESLCE Integration Routes for MERP Student Assistant.
Provides past exam practice, exam simulation, and progress tracking.
All endpoints are prefixed with /api/eslce via main.py.
"""
import secrets
import random
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from database import get_db
from routes.students import get_current_user_id
from models.StudentInfo import StudentInfo
from models.EslceSubject import EslceSubject
from models.EslceQuestionType import EslceQuestionType
from models.EslceQuestion import EslceQuestion
from models.EslceQuestionOption import EslceQuestionOption
from models.EslceExam import EslceExam
from models.EslceExamQuestion import EslceExamQuestion
from models.EslceStudentSession import EslceStudentSession
from models.EslceStudentResponse import EslceStudentResponse
from models.EslcePassage import EslcePassage
from models.EslceQuestionPassage import EslceQuestionPassage
from models.EslceQuestionImage import EslceQuestionImage

router = APIRouter()


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def _attach_question_media(db: Session, questions: list) -> list:
    """Adds 'passage' and 'images' to each question dict in place.

    - passage: the reading-comprehension passage linked via
      eslce_question_passages (first link). Content scraped from the source
      tables, which stored the full passage text.
    - images: ordered list of {description, url} from eslce_question_images.
    """
    if not questions:
        return questions

    q_ids = [q.get("id") for q in questions if q.get("id") is not None]

    # passages
    links = (
        db.query(EslceQuestionPassage)
        .filter(EslceQuestionPassage.question_id.in_(q_ids))
        .all()
    )
    passage_ids = {l.passage_id for l in links}
    passages = {}
    if passage_ids:
        p_rows = db.query(EslcePassage).filter(EslcePassage.id.in_(passage_ids)).all()
        passages = {p.id: p for p in p_rows}
    passage_by_qid = {}
    for l in links:
        p = passages.get(l.passage_id)
        if p is not None:
            passage_by_qid.setdefault(l.question_id, {
                "id": p.id,
                "code": p.passage_code,
                "title": p.title or "",
                "content": p.content or "",
                "exam_year": p.exam_year,
                "word_count": p.word_count,
            })

    # images
    img_rows = (
        db.query(EslceQuestionImage)
        .filter(EslceQuestionImage.question_id.in_(q_ids))
        .order_by(EslceQuestionImage.question_id, EslceQuestionImage.display_order)
        .all()
    )
    images_by_qid = {}
    for im in img_rows:
        images_by_qid.setdefault(im.question_id, []).append({
            "id": im.id,
            "description": im.image_description or "",
            "url": im.image_path or "",
        })

    for q in questions:
        qid = q.get("id")
        if qid is not None:
            q["passage"] = passage_by_qid.get(qid)
            q["images"] = images_by_qid.get(qid, [])
        else:
            q["passage"] = None
            q["images"] = []
    return questions

def _get_student_id(db: Session, user_id: str) -> str:
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student.StudentID


def _get_exam_with_subject(db: Session, exam_id: int) -> dict:
    exam = db.query(EslceExam).filter(EslceExam.id == exam_id).first()
    if not exam:
        return None
    subject = db.query(EslceSubject).filter(EslceSubject.id == exam.subject_id).first()
    return {
        "id": exam.id,
        "subject_id": exam.subject_id,
        "subject_name": subject.name if subject else "Unknown",
        "subject_code": subject.code if subject else "???",
        "year": exam.year,
        "semester": exam.semester,
        "type": exam.type,
        "title": exam.title,
        "total_questions": exam.total_questions,
        "total_marks": float(exam.total_marks) if exam.total_marks else 0,
        "duration_minutes": exam.duration_minutes,
        "exam_type": exam.exam_type,
    }


def _get_questions_for_exam(db: Session, exam_id: int) -> list:
    eq_rows = (
        db.query(EslceExamQuestion)
        .filter(EslceExamQuestion.exam_id == exam_id)
        .order_by(EslceExamQuestion.question_number)
        .all()
    )
    if not eq_rows:
        return []

    q_ids = [eq.question_id for eq in eq_rows]
    questions = db.query(EslceQuestion).filter(EslceQuestion.id.in_(q_ids)).all()
    q_map = {q.id: q for q in questions}

    options = db.query(EslceQuestionOption).filter(
        EslceQuestionOption.question_id.in_(q_ids)
    ).all()
    opts_by_q = {}
    for o in options:
        opts_by_q.setdefault(o.question_id, []).append(o)

    result = []
    for eq in eq_rows:
        q = q_map.get(eq.question_id)
        if not q:
            continue
        q_opts = sorted(opts_by_q.get(q.id, []), key=lambda x: x.display_order or 0)
        result.append({
            "id": q.id,
            "code": q.code,
            "text": q.text,
            "marks": float(q.marks) if q.marks else 1.0,
            "difficulty": q.difficulty,
            "question_number": eq.question_number,
            "options": [
                {
                    "id": o.id,
                    "label": o.label,
                    "text": o.text,
                    "is_correct": o.is_correct,
                    "explanation": o.explanation,
                }
                for o in q_opts
            ],
        })
    _attach_question_media(db, result)
    return result


def _build_shuffled_questions(db: Session, exam_id: int, shuffle: bool = True) -> list:
    """Get questions for an exam, optionally shuffled."""
    questions = _get_questions_for_exam(db, exam_id)
    if shuffle:
        random.shuffle(questions)
    return questions


def _grade_responses(questions: list, answers: dict) -> dict:
    """
    Grade answers against questions.
    answers: dict of {question_id: selected_option_id}
    Returns: graded results with per-question detail.
    """
    correct = 0
    wrong = 0
    unanswered = 0
    graded = []

    for q in questions:
        qid = q["id"]
        selected = answers.get(str(qid))
        if selected is None:
            selected = answers.get(qid)

        correct_opt = next((o for o in q["options"] if o["is_correct"]), None)
        selected_opt = next((o for o in q["options"] if o["id"] == selected), None)

        if selected is None:
            verdict = "unanswered"
            unanswered += 1
        elif correct_opt and selected == correct_opt["id"]:
            verdict = "correct"
            correct += 1
        else:
            verdict = "wrong"
            wrong += 1

        wrong_explanation = None
        if verdict == "wrong" and selected_opt and selected_opt.get("explanation"):
            wrong_explanation = selected_opt["explanation"]

        graded.append({
            "question_id": qid,
            "question_number": q.get("question_number"),
            "text": q["text"],
            "code": q.get("code"),
            "passage": q.get("passage"),
            "images": q.get("images", []),
            "selected_option_id": selected,
            "correct_option_id": correct_opt["id"] if correct_opt else None,
            "correct_option_label": correct_opt["label"] if correct_opt else None,
            "correct_option_text": correct_opt["text"] if correct_opt else None,
            "verdict": verdict,
            "wrong_explanation": wrong_explanation,
            "correct_explanation": correct_opt.get("explanation") if correct_opt else None,
            "options": q["options"],
        })

    total = len(questions)
    percentage = round(correct / total * 100, 1) if total > 0 else 0
    return {
        "total_questions": total,
        "correct_count": correct,
        "wrong_count": wrong,
        "unanswered_count": unanswered,
        "percentage": percentage,
        "graded_questions": graded,
    }


def _resolve_exam(db: Session, exam_id: int) -> dict:
    """Look up an exam by id. Real exams come from eslece_exams; predicted exams are
    generated on the fly from eslce_questions (source_type='generated')."""
    real = _get_exam_with_subject(db, exam_id)
    if real:
        return real
    virtual = _get_virtual_exam(db, exam_id)
    if virtual:
        return virtual
    raise HTTPException(status_code=404, detail="Exam not found")


def _resolve_questions(db: Session, exam_id: int, shuffle: bool = True) -> list:
    """Fetch questions for an exam. Real exams use the eslece_exam_questions junction;
    predicted exams query eslce_questions by source_type='generated'."""
    real = _get_questions_for_exam(db, exam_id)
    if real:
        if shuffle:
            random.shuffle(real)
            for i, q in enumerate(real, 1):
                q["question_number"] = i
        return real
    virtual = _get_virtual_exam_questions(db, exam_id, shuffle=shuffle)
    if virtual:
        return virtual
    raise HTTPException(status_code=404, detail="Exam questions not found")


# ---------------------------------------------------------------------------
#  GET /api/eslce/subjects
# ---------------------------------------------------------------------------

# ESLCE-relevant SubjectIDs in SubjectsInfo
_ESLCE_SUBJECT_IDS = {
    "ENGLISH", "AMHAR", "MATH", "PHYSIC", "CHEMIS", "BIOLOGY",
    "HISTOR", "GEOGR", "CIVICS", "ECONO", "HEALTH", "INFOTECH", "AGRISC",
}

@router.get("/subjects")
def list_subjects(db: Session = Depends(get_db)):
    subjects = db.query(EslceSubject).order_by(EslceSubject.id).all()
    if subjects:
        return [
            {"id": s.id, "name": s.name, "code": s.code, "merp_subject_id": s.merp_subject_id}
            for s in subjects
        ]

    # Fallback: read from SubjectsInfo when eslce_subjects is empty
    from models.SubjectsInfo import SubjectsInfo
    rows = (
        db.query(SubjectsInfo)
        .filter(SubjectsInfo.SubjectID.in_(_ESLCE_SUBJECT_IDS))
        .order_by(SubjectsInfo.SubjectID)
        .all()
    )

    # Map SubjectID → synthetic integer id
    _sid_map = {
        "ENGLISH": 1, "AMHAR": 2, "MATH": 3, "PHYSIC": 4, "CHEMIS": 5,
        "BIOLOGY": 6, "HISTOR": 7, "GEOGR": 8, "CIVICS": 9, "ECONO": 10,
        "HEALTH": 100, "INFOTECH": 101, "AGRISC": 102,
    }
    return [
        {
            "id": _sid_map.get(r.SubjectID, 99),
            "name": r.SubjectDescription,
            "code": r.SubjectID[:3].upper(),
            "merp_subject_id": r.SubjectID,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
#  GET /api/eslce/exams
# ---------------------------------------------------------------------------

@router.get("/exams")
def list_exams(
    subject_id: Optional[int] = Query(default=None),
    year: Optional[int] = Query(default=None),
    exam_type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(EslceExam)
    if subject_id is not None:
        q = q.filter(EslceExam.subject_id == subject_id)
    if year is not None:
        q = q.filter(EslceExam.year == year)
    if exam_type is not None:
        q = q.filter(EslceExam.exam_type == exam_type)

    exams = q.order_by(EslceExam.year.desc(), EslceExam.subject_id).all()
    real = []
    for e in exams:
        info = _get_exam_with_subject(db, e.id)
        if info:
            real.append(info)

    # Predicted exams come from eslce_questions where source_type='generated'
    virtual = _generate_virtual_from_eslce_tables(db, subject_id)

    # Apply exam_type filter to virtual exams too
    if exam_type is not None:
        virtual = [v for v in virtual if v["exam_type"] == exam_type]

    return real + virtual


def _build_virtual_exam_index(db: Session):
    """
    Build a list of virtual exam entries from the eslce_questions table.

    - generated questions → one 'predicted' exam per subject containing all of
      that subject's generated questions (no arbitrary chunking)
    - bank questions that are NOT already linked to a real exam via
      eslce_exam_questions → one 'past' exam per subject. Bank questions that
      ARE linked are already covered by the real exams in eslce_exams, so they
      are skipped to avoid duplicates.

    Returns list of dicts: [{offset, subject_id, subject_name, subject_code,
                             exam_type, source_type, total_questions,
                             title, year}, ...]
    """
    from models.EslceSubject import EslceSubject

    subjects = db.query(EslceSubject).order_by(EslceSubject.id).all()
    subject_map = {s.id: s for s in subjects}

    # Question ids already covered by a real exam (all bank questions are linked
    # via eslce_exam_questions, so they should not generate virtual 'past' exams).
    linked_qids = {row[0] for row in db.query(EslceExamQuestion.question_id).all()}

    # Count questions per (subject_id, source_type), excluding linked bank qs.
    rows = (
        db.query(
            EslceQuestion.subject_id,
            EslceQuestion.source_type,
            func.count(EslceQuestion.id).label("cnt"),
        )
        .filter(
            EslceQuestion.is_active == True,
            EslceQuestion.id.notin_(linked_qids) if linked_qids else True,
        )
        .group_by(EslceQuestion.subject_id, EslceQuestion.source_type)
        .order_by(EslceQuestion.subject_id, EslceQuestion.source_type)
        .all()
    )

    if not rows:
        return []

    index = []
    offset = 0
    for subj_id, source_type, count in rows:
        offset += 1
        exam_type = "past" if source_type == "bank" else "predicted"
        subj = subject_map.get(subj_id)
        name = subj.name if subj else f"Subject {subj_id}"
        code = subj.code if subj else "???"

        if exam_type == "predicted":
            year = 2026
            title = f"{name} Predicted 2026"
            semester = "First Semester"
        else:
            year = 2026
            title = f"{name} Practice Bank"
            semester = "First Semester"

        index.append({
            "offset": offset,
            "subject_id": subj_id,
            "subject_name": name,
            "subject_code": code,
            "exam_type": exam_type,
            "source_type": source_type,
            "total_questions": count,
            "title": title,
            "year": year,
            "semester": semester,
        })

    return index


def _generate_virtual_from_eslce_tables(db: Session, subject_id_filter: Optional[int] = None):
    """Generate virtual exams from eslce_questions + eslce_question_options."""
    index = _build_virtual_exam_index(db)
    if not index:
        return []

    virtual_exams = []
    for entry in index:
        if subject_id_filter is not None and entry["subject_id"] != subject_id_filter:
            continue
        virtual_exams.append({
            "id": 90000 + entry["offset"],
            "subject_id": entry["subject_id"],
            "subject_name": entry["subject_name"],
            "subject_code": entry["subject_code"],
            "year": entry["year"],
            "semester": entry["semester"],
            "type": "National",
            "title": entry["title"],
            "total_questions": entry["total_questions"],
            "total_marks": float(entry["total_questions"]),
            "exam_type": entry["exam_type"],
            "virtual": True,
        })

    return virtual_exams


# ---------------------------------------------------------------------------
#  GET /api/eslce/exams/{exam_id}
# ---------------------------------------------------------------------------

@router.get("/exams/{exam_id}")
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    return _resolve_exam(db, exam_id)


def _get_virtual_exam(db: Session, exam_id: int):
    """Build an exam dict for a virtual exam using the shared index. Returns None if not found."""
    index = _build_virtual_exam_index(db)
    virtual_offset = exam_id - 90000

    for entry in index:
        if entry["offset"] == virtual_offset:
            return {
                "id": exam_id,
                "subject_id": entry["subject_id"],
                "subject_name": entry["subject_name"],
                "subject_code": entry["subject_code"],
                "year": entry["year"],
                "semester": entry["semester"],
                "type": "National",
                "title": entry["title"],
                "total_questions": entry["total_questions"],
                "total_marks": float(entry["total_questions"]),
                "exam_type": entry["exam_type"],
                "virtual": True,
            }

    return None


# ---------------------------------------------------------------------------
#  GET /api/eslce/exams/{exam_id}/questions
# ---------------------------------------------------------------------------

@router.get("/exams/{exam_id}/questions")
def get_exam_questions(
    exam_id: int,
    shuffle: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return _resolve_questions(db, exam_id, shuffle=shuffle)


def _get_virtual_exam_questions(db: Session, exam_id: int, shuffle: bool = True):
    """Fetch questions for a virtual exam from the eslce_questions table."""
    from models.EslceQuestion import EslceQuestion
    from models.EslceQuestionOption import EslceQuestionOption

    index = _build_virtual_exam_index(db)
    virtual_offset = exam_id - 90000

    entry = None
    for e in index:
        if e["offset"] == virtual_offset:
            entry = e
            break

    if not entry:
        return None

    # Fetch questions for this subject filtered by source_type
    q = db.query(EslceQuestion).filter(
        EslceQuestion.subject_id == entry["subject_id"],
        EslceQuestion.source_type == entry["source_type"],
        EslceQuestion.is_active == True,
    )
    # Exclude bank questions already linked to a real exam (dedupe with real past exams)
    if entry["source_type"] == "bank":
        linked_qids = {row[0] for row in db.query(EslceExamQuestion.question_id).all()}
        if linked_qids:
            q = q.filter(EslceQuestion.id.notin_(linked_qids))
    all_qs = q.order_by(EslceQuestion.id).all()

    q_ids = [qq.id for qq in all_qs]

    # Fetch options
    option_rows = (
        db.query(EslceQuestionOption)
        .filter(EslceQuestionOption.question_id.in_(q_ids))
        .order_by(EslceQuestionOption.question_id, EslceQuestionOption.display_order)
        .all()
    )
    opts_by_q = {}
    for o in option_rows:
        opts_by_q.setdefault(o.question_id, []).append(o)

    questions = []
    for i, qq in enumerate(all_qs, 1):
        q_opts = sorted(opts_by_q.get(qq.id, []), key=lambda x: x.display_order or 0)
        questions.append({
            "id": qq.id,
            "code": qq.code,
            "text": qq.text,
            "marks": float(qq.marks) if qq.marks else 1.0,
            "difficulty": qq.difficulty,
            "question_number": i,
            "options": [
                {
                    "id": o.id,
                    "label": o.label,
                    "text": o.text,
                    "is_correct": o.is_correct,
                    "explanation": o.explanation,
                }
                for o in q_opts
            ],
        })

    _attach_question_media(db, questions)

    if shuffle:
        random.shuffle(questions)
        for i, q in enumerate(questions, 1):
            q["question_number"] = i

    return questions


# ---------------------------------------------------------------------------
#  POST /api/eslce/exam/start
# ---------------------------------------------------------------------------

class ExamStartRequest(BaseModel):
    exam_id: int
    mode: str = "exam"  # 'exam' or 'practice'
    shuffle: bool = True


@router.post("/exam/start")
def start_exam(
    req: ExamStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)

    exam_info = _resolve_exam(db, req.exam_id)
    questions = _resolve_questions(db, req.exam_id, shuffle=req.shuffle)

    session_key = secrets.token_hex(32)
    session = EslceStudentSession(
        session_key=session_key,
        student_id=student_id,
        subject_name=exam_info["subject_name"],
        exam_id=req.exam_id,
        exam_type=exam_info["exam_type"],
        mode=req.mode,
        source_year=exam_info["year"],
        title=exam_info.get("title") or f"{exam_info['subject_name']} {exam_info['year']} {exam_info['semester']}",
        total_questions=len(questions),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Strip correct answers for exam mode
    safe_questions = []
    for q in questions:
        safe_opts = [
            {"id": o["id"], "label": o["label"], "text": o["text"]}
            for o in q["options"]
        ]
        safe_questions.append({
            "id": q["id"],
            "code": q.get("code"),
            "text": q["text"],
            "marks": q["marks"],
            "question_number": q.get("question_number"),
            "passage": q.get("passage"),
            "images": q.get("images", []),
            "options": safe_opts,
        })

    return {
        "session_id": session.id,
        "session_key": session_key,
        "exam": exam_info,
        "mode": req.mode,
        "total_questions": len(questions),
        "questions": safe_questions,
    }


# ---------------------------------------------------------------------------
#  POST /api/eslce/exam/submit
# ---------------------------------------------------------------------------

class ExamSubmitRequest(BaseModel):
    session_id: int
    answers: dict  # {question_id: option_id}
    time_spent_ms: Optional[int] = None


@router.post("/exam/submit")
def submit_exam(
    req: ExamSubmitRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    session = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.id == req.session_id,
            EslceStudentSession.student_id == student_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.completed_at:
        raise HTTPException(status_code=400, detail="Session already completed")

    questions = _resolve_questions(db, session.exam_id, shuffle=False)
    result = _grade_responses(questions, req.answers)

    # Save responses
    for gq in result["graded_questions"]:
        resp = EslceStudentResponse(
            session_id=session.id,
            question_id=gq["question_id"],
            selected_option_id=gq["selected_option_id"],
            is_correct=gq["verdict"] == "correct",
            verdict=gq["verdict"],
        )
        db.add(resp)

    # Update session
    session.correct_count = result["correct_count"]
    session.wrong_count = result["wrong_count"]
    session.unanswered_count = result["unanswered_count"]
    session.percentage = result["percentage"]
    session.time_spent_ms = req.time_spent_ms
    session.completed_at = datetime.now(timezone.utc)

    db.commit()

    return {
        "session_id": session.id,
        "exam": _resolve_exam(db, session.exam_id),
        "mode": session.mode,
        "total_questions": result["total_questions"],
        "correct_count": result["correct_count"],
        "wrong_count": result["wrong_count"],
        "unanswered_count": result["unanswered_count"],
        "percentage": result["percentage"],
        "time_spent_ms": req.time_spent_ms,
        "graded_questions": result["graded_questions"],
    }


# ---------------------------------------------------------------------------
#  POST /api/eslce/practice/start
# ---------------------------------------------------------------------------

@router.post("/practice/start")
def start_practice(
    req: ExamStartRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    """Same as exam/start but mode='practice'."""
    req.mode = "practice"
    return start_exam(req, db, user_id)


# ---------------------------------------------------------------------------
#  POST /api/eslce/practice/answer  (single-question instant feedback)
# ---------------------------------------------------------------------------

class PracticeAnswerRequest(BaseModel):
    session_id: int
    question_id: int
    selected_option_id: int


@router.post("/practice/answer")
def answer_practice(
    req: PracticeAnswerRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    session = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.id == req.session_id,
            EslceStudentSession.student_id == student_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    q = db.query(EslceQuestion).filter(EslceQuestion.id == req.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    options = (
        db.query(EslceQuestionOption)
        .filter(EslceQuestionOption.question_id == req.question_id)
        .order_by(EslceQuestionOption.display_order)
        .all()
    )
    correct_opt = next((o for o in options if o.is_correct), None)
    selected_opt = next((o for o in options if o.id == req.selected_option_id), None)

    is_correct = correct_opt and req.selected_option_id == correct_opt.id
    verdict = "correct" if is_correct else "wrong"

    resp = EslceStudentResponse(
        session_id=session.id,
        question_id=req.question_id,
        selected_option_id=req.selected_option_id,
        is_correct=is_correct,
        verdict=verdict,
    )
    db.add(resp)

    # Update session counts
    if is_correct:
        session.correct_count += 1
    else:
        session.wrong_count += 1
    session.total_questions = session.correct_count + session.wrong_count + session.unanswered_count
    if session.total_questions > 0:
        session.percentage = round(session.correct_count / session.total_questions * 100, 1)

    db.commit()

    wrong_explanation = None
    if not is_correct and selected_opt and selected_opt.explanation:
        wrong_explanation = selected_opt.explanation

    return {
        "is_correct": is_correct,
        "verdict": verdict,
        "correct_option_id": correct_opt.id if correct_opt else None,
        "correct_option_label": correct_opt.label if correct_opt else None,
        "correct_option_text": correct_opt.text if correct_opt else None,
        "correct_explanation": correct_opt.explanation if correct_opt else None,
        "wrong_explanation": wrong_explanation,
        "running_score": {
            "correct": session.correct_count,
            "wrong": session.wrong_count,
            "unanswered": session.unanswered_count,
            "percentage": session.percentage,
        },
    }


# ---------------------------------------------------------------------------
#  POST /api/eslce/practice/complete
# ---------------------------------------------------------------------------

class PracticeCompleteRequest(BaseModel):
    session_id: int
    time_spent_ms: Optional[int] = None


@router.post("/practice/complete")
def complete_practice(
    req: PracticeCompleteRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    session = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.id == req.session_id,
            EslceStudentSession.student_id == student_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.time_spent_ms = req.time_spent_ms
    session.completed_at = datetime.now(timezone.utc)
    db.commit()

    return {
        "session_id": session.id,
        "total_questions": session.total_questions,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "unanswered_count": session.unanswered_count,
        "percentage": session.percentage,
    }


# ---------------------------------------------------------------------------
#  GET /api/eslce/progress/overview
# ---------------------------------------------------------------------------

@router.get("/progress/overview")
def progress_overview(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    sessions = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.student_id == student_id,
            EslceStudentSession.completed_at.isnot(None),
        )
        .order_by(EslceStudentSession.completed_at.desc())
        .all()
    )
    if not sessions:
        return {
            "total_sessions": 0,
            "avg_percentage": 0,
            "total_correct": 0,
            "total_wrong": 0,
            "total_unanswered": 0,
            "best_percentage": 0,
            "recent_sessions": [],
        }

    total_correct = sum(s.correct_count for s in sessions)
    total_wrong = sum(s.wrong_count for s in sessions)
    total_unanswered = sum(s.unanswered_count for s in sessions)
    avg_pct = round(sum(s.percentage or 0 for s in sessions) / len(sessions), 1)
    best_pct = max(s.percentage or 0 for s in sessions)

    recent = []
    for s in sessions[:10]:
        recent.append({
            "session_id": s.id,
            "subject_name": s.subject_name,
            "title": s.title,
            "exam_type": s.exam_type,
            "mode": s.mode,
            "correct_count": s.correct_count,
            "wrong_count": s.wrong_count,
            "unanswered_count": s.unanswered_count,
            "percentage": s.percentage,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        })

    return {
        "total_sessions": len(sessions),
        "avg_percentage": avg_pct,
        "total_correct": total_correct,
        "total_wrong": total_wrong,
        "total_unanswered": total_unanswered,
        "best_percentage": best_pct,
        "recent_sessions": recent,
    }


# ---------------------------------------------------------------------------
#  GET /api/eslce/progress/subjects
# ---------------------------------------------------------------------------

@router.get("/progress/subjects")
def progress_by_subject(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    rows = (
        db.query(
            EslceStudentSession.subject_name,
            func.count(EslceStudentSession.id).label("sessions"),
            func.avg(EslceStudentSession.percentage).label("avg_pct"),
            func.sum(EslceStudentSession.correct_count).label("total_correct"),
            func.sum(EslceStudentSession.wrong_count).label("total_wrong"),
        )
        .filter(
            EslceStudentSession.student_id == student_id,
            EslceStudentSession.completed_at.isnot(None),
        )
        .group_by(EslceStudentSession.subject_name)
        .all()
    )
    return [
        {
            "subject_name": r.subject_name,
            "sessions": r.sessions,
            "avg_percentage": round(float(r.avg_pct), 1) if r.avg_pct else 0,
            "total_correct": int(r.total_correct or 0),
            "total_wrong": int(r.total_wrong or 0),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
#  GET /api/eslce/progress/history
# ---------------------------------------------------------------------------

@router.get("/progress/history")
def progress_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    total = (
        db.query(func.count(EslceStudentSession.id))
        .filter(
            EslceStudentSession.student_id == student_id,
            EslceStudentSession.completed_at.isnot(None),
        )
        .scalar()
    )
    sessions = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.student_id == student_id,
            EslceStudentSession.completed_at.isnot(None),
        )
        .order_by(EslceStudentSession.completed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return {
        "total": total,
        "sessions": [
            {
                "session_id": s.id,
                "subject_name": s.subject_name,
                "title": s.title,
                "exam_type": s.exam_type,
                "mode": s.mode,
                "total_questions": s.total_questions,
                "correct_count": s.correct_count,
                "wrong_count": s.wrong_count,
                "unanswered_count": s.unanswered_count,
                "percentage": s.percentage,
                "time_spent_ms": s.time_spent_ms,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sessions
        ],
    }


# ---------------------------------------------------------------------------
#  GET /api/eslce/progress/history/{session_id}
# ---------------------------------------------------------------------------

@router.get("/progress/history/{session_id}")
def progress_session_detail(
    session_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    session = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.id == session_id,
            EslceStudentSession.student_id == student_id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    responses = (
        db.query(EslceStudentResponse)
        .filter(EslceStudentResponse.session_id == session_id)
        .all()
    )

    # Load questions for context
    questions = _resolve_questions(db, session.exam_id, shuffle=False) if session.exam_id else []
    q_map = {q["id"]: q for q in questions}

    graded = []
    for r in responses:
        q = q_map.get(r.question_id, {})
        correct_opt = next((o for o in q.get("options", []) if o.get("is_correct")), None)
        graded.append({
            "question_id": r.question_id,
            "selected_option_id": r.selected_option_id,
            "is_correct": r.is_correct,
            "verdict": r.verdict,
            "question_text": q.get("text", ""),
            "passage": q.get("passage"),
            "images": q.get("images", []),
            "correct_option_label": correct_opt.get("label") if correct_opt else None,
            "correct_option_text": correct_opt.get("text") if correct_opt else None,
        })

    return {
        "session_id": session.id,
        "subject_name": session.subject_name,
        "title": session.title,
        "exam_type": session.exam_type,
        "mode": session.mode,
        "total_questions": session.total_questions,
        "correct_count": session.correct_count,
        "wrong_count": session.wrong_count,
        "unanswered_count": session.unanswered_count,
        "percentage": session.percentage,
        "time_spent_ms": session.time_spent_ms,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "responses": graded,
    }


# ---------------------------------------------------------------------------
#  GET /api/eslce/progress/retake-compare
# ---------------------------------------------------------------------------

@router.get("/progress/retake-compare")
def retake_compare(
    exam_id: int = Query(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    student_id = _get_student_id(db, user_id)
    sessions = (
        db.query(EslceStudentSession)
        .filter(
            EslceStudentSession.student_id == student_id,
            EslceStudentSession.exam_id == exam_id,
            EslceStudentSession.completed_at.isnot(None),
        )
        .order_by(EslceStudentSession.completed_at.asc())
        .all()
    )
    if len(sessions) < 2:
        return {"sessions": [], "comparison": None}

    first = sessions[0]
    latest = sessions[-1]
    improvement = round((latest.percentage or 0) - (first.percentage or 0), 1)

    return {
        "sessions": [
            {
                "session_id": s.id,
                "percentage": s.percentage,
                "correct_count": s.correct_count,
                "wrong_count": s.wrong_count,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sessions
        ],
        "comparison": {
            "first_session_id": first.id,
            "latest_session_id": latest.id,
            "first_percentage": first.percentage,
            "latest_percentage": latest.percentage,
            "improvement": improvement,
        },
    }


# ---------------------------------------------------------------------------
#  GET /api/eslce/debug/virtual-index  (temporary diagnostic)
# ---------------------------------------------------------------------------

@router.get("/debug/virtual-index")
def debug_virtual_index(
    db: Session = Depends(get_db),
):
    """Return the raw virtual exam index so we can verify generated questions appear."""
    index = _build_virtual_exam_index(db)
    exams = _generate_virtual_from_eslce_tables(db)
    return {
        "index_entries": len(index),
        "virtual_exams": len(exams),
        "index": index,
        "sample_virtual": exams[:5] if exams else [],
        "real_exam_count": db.query(func.count(EslceExam.id)).scalar(),
    }
