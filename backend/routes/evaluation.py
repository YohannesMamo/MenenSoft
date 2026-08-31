from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional
import json


from database import get_db
from models.EvaluationConfig import EvaluationConfig
from models.StudentInfo import StudentInfo
from models.StudentMetrics import StudentMetrics
from models.StudentMetricsMv import StudentMetricsMv
from models.StuSubjectMastery import StuSubjectMastery
from models.QuizSession import QuizSession
from models.ExamSession import ExamSession
from models.StuSectionProgress import StuSectionProgress
from models.StudySession import StudySession
from models.STextBook import STextBook
from models.SubjectsInfo import SubjectsInfo

router = APIRouter()

DEFAULT_CONFIGS_PATH = "routes/evaluation_defaults.json"

def _load_defaults():
    import json, os
    p = os.path.join(os.path.dirname(__file__), "evaluation_defaults.json")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


@router.get("/api/evaluation/config")
def get_evaluation_config(db: Session = Depends(get_db)):
    rows = db.query(EvaluationConfig).all()
    if not rows:
        defaults = _load_defaults()
        for key, value in defaults.items():
            db.add(EvaluationConfig(config_key=key, config_value=value, description=f"Default {key.replace('_',' ')} configuration"))
        db.commit()
        rows = db.query(EvaluationConfig).all()
    return {row.config_key: row.config_value for row in rows}


@router.get("/api/evaluation/config/{config_key}")
def get_single_config(config_key: str, db: Session = Depends(get_db)):
    row = db.query(EvaluationConfig).filter(EvaluationConfig.config_key == config_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Config '{config_key}' not found")
    return {row.config_key: row.config_value}


@router.put("/api/evaluation/config/{config_key}")
def update_config(config_key: str, body: dict, db: Session = Depends(get_db)):
    row = db.query(EvaluationConfig).filter(EvaluationConfig.config_key == config_key).first()
    if not row:
        raise HTTPException(status_code=404, detail=f"Config '{config_key}' not found")
    row.config_value = body.get("config_value", body)
    db.commit()
    return {"success": True, "config_key": config_key}


# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────

def _get_letter_grade(pct, grade_scale):
    for g in grade_scale:
        if pct >= g["min"]:
            return g
    return grade_scale[-1] if grade_scale else {"grade": "F", "min": 0, "color": "red", "label": "Fail"}


def _get_score_label(value, thresholds, metric_id="default"):
    t = thresholds.get(metric_id, thresholds.get("default", {}))
    if metric_id == "responseTime":
        if value <= t.get("high", {}).get("max", 15):
            return t["high"]
        if value <= t.get("medium", {}).get("max", 30):
            return t["medium"]
        return t.get("low", {"label": "Slow", "color": "amber"})
    elif metric_id == "improvement":
        if value >= t.get("high", {}).get("min", 2.0):
            return t["high"]
        if value >= t.get("medium", {}).get("min", 1.0):
            return t["medium"]
        return t.get("low", {"label": "Slow", "color": "amber"})
    elif metric_id == "risk":
        if value <= t.get("high", {}).get("max", 40):
            return t["high"]
        if value <= t.get("medium", {}).get("max", 69):
            return t["medium"]
        return t.get("low", {"label": "High Risk", "color": "rose"})
    else:
        if value >= t.get("high", {}).get("min", 80):
            return t["high"]
        if value >= t.get("medium", {}).get("min", 60):
            return t["medium"]
        return t.get("low", {"label": "Needs Work", "color": "amber"})


def _compute_risk(accuracy, consistency, completion_rate, mastery, response_time, formula):
    risk = formula.get("baseScore", 0.5)
    for p in formula.get("penalties", []):
        val = {
            "accuracy": accuracy,
            "responseTime": response_time,
            "consistency": consistency,
            "completion": completion_rate,
            "mastery": mastery,
        }.get(p["metric"], 0)
        if p["condition"] == "lessThan" and val < p["threshold"]:
            risk += p["add"]
        elif p["condition"] == "greaterThan" and val > p["threshold"]:
            risk += p["add"]
    return round(min(risk, formula.get("cap", 1.0)), 4)


def _build_subject_map(db):
    books = db.query(STextBook).all()
    subject_ids = list(set(b.STBSubjectID for b in books if b.STBSubjectID))
    subjects = db.query(SubjectsInfo).filter(SubjectsInfo.SubjectID.in_(subject_ids)).all() if subject_ids else []
    subj_map = {s.SubjectID: s.SubjectDescription or s.SubjectID for s in subjects}
    return {b.STBID: subj_map.get(b.STBSubjectID, b.STBSubjectID or "Unknown") for b in books}


# ─────────────────────────────────────────────────────────
# REPORT ENDPOINT
# ─────────────────────────────────────────────────────────

@router.get("/api/evaluation/report")
def get_student_report(request: Request, db: Session = Depends(get_db)):
    from routes.students import get_current_user_id
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user_id = get_current_user_id(token=token, db=db)
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_id = student.StudentID
    grade_level = student.StuGrade or "Unknown"
    is_grade_12 = "12" in str(grade_level)
    full_name = " ".join(filter(None, [student.StuFirstName, student.StuMiddleName, student.StuLastName]))

    # ── Load config ──
    config_rows = db.query(EvaluationConfig).all()
    config = {r.config_key: r.config_value for r in config_rows}
    if not config:
        config = _load_defaults()

    grade_scale = config.get("letter_grades", {}).get("grades", [])
    thresholds = config.get("score_thresholds", {})
    risk_formula_cfg = config.get("risk_formula", {})

    # ── Subject lookup ──
    stb_to_subject = _build_subject_map(db)

    # ── Grade-wide totals (all textbooks for this student's grade) ──
    grade_books = db.query(STextBook).filter(STextBook.STBGradeID == grade_level).all()
    total_sections_in_grade = sum(b.SectionCount or 0 for b in grade_books if getattr(b, 'SectionCount', None))

    # Per-subject grade-wide section totals
    subject_grade_totals = {}
    for b in grade_books:
        subj = stb_to_subject.get(b.STBID, "Unknown")
        subject_grade_totals[subj] = subject_grade_totals.get(subj, 0) + (b.SectionCount or 0)
    subject_grade_completed = {}

    # ── 1. STUDY SECTION ──
    study_sessions = db.query(StudySession).filter(
        StudySession.StudentID == student_id,
        StudySession.EndedAt.isnot(None)
    ).all()

    section_progress = db.query(StuSectionProgress).filter(
        StuSectionProgress.StudentID == student_id
    ).all()

    completed_sections = [s for s in section_progress if s.IsCompleted]
    # Total recorded study time across ALL studied sections (not only completed)
    total_study_seconds = sum((s.TimeSpentSeconds or 0) for s in section_progress)
    textbooks_studied = list(set(s.STBID for s in section_progress if s.STBID))

    for s in section_progress:
        subj = stb_to_subject.get(s.STBID, "Unknown")
        if s.IsCompleted:
            subject_grade_completed[subj] = subject_grade_completed.get(subj, 0) + 1

    # Study by subject
    study_by_subject = {}
    for s in section_progress:
        subj = stb_to_subject.get(s.STBID, "Unknown")
        if subj not in study_by_subject:
            study_by_subject[subj] = {"sectionsStudied": 0, "sectionsCompleted": 0, "studySeconds": 0, "textbooks": set()}
        study_by_subject[subj]["sectionsStudied"] += 1
        if s.IsCompleted:
            study_by_subject[subj]["sectionsCompleted"] += 1
        study_by_subject[subj]["studySeconds"] += s.TimeSpentSeconds or 0
        study_by_subject[subj]["textbooks"].add(s.STBID)

    study_subject_summary = []
    for subj, data in study_by_subject.items():
        secs = data["sectionsCompleted"]
        total_secs = data["sectionsStudied"]
        grade_total = subject_grade_totals.get(subj, total_secs) or 1
        study_subject_summary.append({
            "subject": subj,
            "sectionsStudied": total_secs,
            "sectionsCompleted": secs,
            "gradeTotalSections": grade_total,
            "completionRate": round(secs / grade_total * 100, 1),
            "studyMinutes": round(data["studySeconds"] / 60, 1),
            "textbookCount": len(data["textbooks"]),
        })

    study_data = {
        "totalSessions": len(study_sessions),
        "totalSectionsStudied": len(section_progress),
        "totalSectionsCompleted": len(completed_sections),
        "gradeTotalSections": total_sections_in_grade,
        "totalStudyHours": round(total_study_seconds / 3600, 1),
        "targetStudyHours": round(total_sections_in_grade * 0.75, 1),
        "totalStudyMinutes": round(total_study_seconds / 60, 1),
        "textbookCount": len(textbooks_studied),
        "textbooksStudied": textbooks_studied,
        "averageSessionMinutes": round(
            total_study_seconds / max(len(study_sessions), 1) / 60, 1
        ),
        "recentSessions": [
            {
                "textbookId": s.STBID,
                "chapterId": s.STBChapterID,
                "startedAt": s.StartedAt.isoformat() if s.StartedAt else None,
                "endedAt": s.EndedAt.isoformat() if s.EndedAt else None,
                "pagesCovered": s.PagesCovered,
            }
            for s in sorted(study_sessions, key=lambda x: x.StartedAt or datetime.min, reverse=True)[:10]
        ],
        "completionRate": round(
            len(completed_sections) / max(total_sections_in_grade, 1) * 100, 1
        ),
        "bySubject": sorted(study_subject_summary, key=lambda x: x["completionRate"], reverse=True),
        "description": f"You have studied {len(textbooks_studied)} textbook(s), "
                       f"completing {len(completed_sections)} out of {total_sections_in_grade} sections "
                       f"across your grade's curriculum, over {len(study_sessions)} study session(s)."
    }

    # ── 2. QUIZ SECTION ──
    quiz_sessions = db.query(QuizSession).filter(
        QuizSession.StudentID == student_id,
        QuizSession.CompletedAt.isnot(None)
    ).all()

    quiz_scores = [float(q.OverallScore) for q in quiz_sessions if q.OverallScore is not None]
    avg_quiz_score = round(sum(quiz_scores) / max(len(quiz_scores), 1), 1)
    best_quiz_score = round(max(quiz_scores), 1) if quiz_scores else 0
    worst_quiz_score = round(min(quiz_scores), 1) if quiz_scores else 0
    quiz_total_questions = sum(q.TotalQuestions or 0 for q in quiz_sessions)
    quiz_total_time = sum(q.TimeSpentSeconds or 0 for q in quiz_sessions)

    quiz_grades = [_get_letter_grade(s, grade_scale) for s in quiz_scores] if quiz_scores else []
    grade_distribution = {}
    for g in quiz_grades:
        label = g.get("grade", "F")
        grade_distribution[label] = grade_distribution.get(label, 0) + 1

    quiz_by_textbook = {}
    for qs in quiz_sessions:
        bid = qs.STBID or "Unknown"
        if bid not in quiz_by_textbook:
            quiz_by_textbook[bid] = {"scores": [], "count": 0}
        quiz_by_textbook[bid]["count"] += 1
        if qs.OverallScore is not None:
            quiz_by_textbook[bid]["scores"].append(float(qs.OverallScore))

    textbook_quiz_summary = []
    for bid, data in quiz_by_textbook.items():
        scores = data["scores"]
        textbook_quiz_summary.append({
            "textbookId": bid,
            "attempts": data["count"],
            "averageScore": round(sum(scores) / max(len(scores), 1), 1),
            "bestScore": round(max(scores), 1) if scores else 0,
            "letterGrade": _get_letter_grade(sum(scores) / max(len(scores), 1), grade_scale) if scores else None
        })

    quiz_data = {
        "totalSessions": len(quiz_sessions),
        "averageScore": avg_quiz_score,
        "bestScore": best_quiz_score,
        "worstScore": worst_quiz_score,
        "averageLetterGrade": _get_letter_grade(avg_quiz_score, grade_scale) if quiz_scores else None,
        "gradeDistribution": grade_distribution,
        "totalQuestionsAnswered": quiz_total_questions,
        "totalTimeSpentMinutes": round(quiz_total_time / 60, 1),
        "averageTimePerQuestion": round(quiz_total_time / max(quiz_total_questions, 1), 1),
        "byTextbook": textbook_quiz_summary,
        "recentSessions": [
            {
                "sessionId": str(q.SessionID),
                "textbookId": q.STBID,
                "sectionId": q.SectionID,
                "score": float(q.OverallScore) if q.OverallScore else 0,
                "totalQuestions": q.TotalQuestions,
                "attemptNumber": q.AttemptNumber,
                "completedAt": q.CompletedAt.isoformat() if q.CompletedAt else None,
                "letterGrade": _get_letter_grade(float(q.OverallScore), grade_scale) if q.OverallScore else None
            }
            for q in sorted(quiz_sessions, key=lambda x: x.CompletedAt or datetime.min, reverse=True)[:15]
        ],
        "description": f"You have completed {len(quiz_sessions)} quizzes with an average score of {avg_quiz_score}% "
                       f"({_get_letter_grade(avg_quiz_score, grade_scale).get('grade', 'N/A') if quiz_scores else 'N/A'}). "
                       f"You answered {quiz_total_questions} questions in total."
    }

    # ── 3. EXAM SECTION ──
    exam_sessions = db.query(ExamSession).filter(
        ExamSession.StudentID == student_id,
        ExamSession.CompletedAt.isnot(None)
    ).all()

    exam_scores = [float(e.OverallScore) for e in exam_sessions if e.OverallScore is not None]
    avg_exam_score = round(sum(exam_scores) / max(len(exam_scores), 1), 1)
    exam_grades = [_get_letter_grade(s, grade_scale) for s in exam_scores] if exam_scores else []
    exam_grade_dist = {}
    for g in exam_grades:
        label = g.get("grade", "F")
        exam_grade_dist[label] = exam_grade_dist.get(label, 0) + 1

    exam_by_subject = {}
    for e in exam_sessions:
        subj = stb_to_subject.get(e.STBID, "Unknown")
        if subj not in exam_by_subject:
            exam_by_subject[subj] = {"scores": [], "count": 0, "correct": 0, "wrong": 0, "total": 0}
        exam_by_subject[subj]["count"] += 1
        if e.OverallScore is not None:
            exam_by_subject[subj]["scores"].append(float(e.OverallScore))
        exam_by_subject[subj]["correct"] += e.CorrectAnswers or 0
        exam_by_subject[subj]["wrong"] += e.WrongAnswers or 0
        exam_by_subject[subj]["total"] += e.TotalQuestions or 0

    exam_subject_summary = []
    for subj, data in exam_by_subject.items():
        scores = data["scores"]
        avg = round(sum(scores) / max(len(scores), 1), 1) if scores else 0
        exam_subject_summary.append({
            "subject": subj,
            "sessions": data["count"],
            "averageScore": avg,
            "bestScore": round(max(scores), 1) if scores else 0,
            "letterGrade": _get_letter_grade(avg, grade_scale) if scores else None,
            "correctAnswers": data["correct"],
            "wrongAnswers": data["wrong"],
            "totalQuestions": data["total"],
            "accuracy": round(data["correct"] / max(data["total"], 1) * 100, 1),
        })

    exam_data = {
        "totalSessions": len(exam_sessions),
        "averageScore": avg_exam_score,
        "bestScore": round(max(exam_scores), 1) if exam_scores else 0,
        "averageLetterGrade": _get_letter_grade(avg_exam_score, grade_scale) if exam_scores else None,
        "gradeDistribution": exam_grade_dist,
        "bySubject": sorted(exam_subject_summary, key=lambda x: x["averageScore"], reverse=True),
        "recentSessions": [
            {
                "sessionId": str(e.SessionID),
                "textbookId": e.STBID,
                "sectionId": e.SectionID,
                "score": float(e.OverallScore) if e.OverallScore else 0,
                "correctAnswers": e.CorrectAnswers,
                "wrongAnswers": e.WrongAnswers,
                "totalQuestions": e.TotalQuestions,
                "attemptNumber": e.AttemptNumber,
                "completedAt": e.CompletedAt.isoformat() if e.CompletedAt else None,
                "letterGrade": _get_letter_grade(float(e.OverallScore), grade_scale) if e.OverallScore else None
            }
            for e in sorted(exam_sessions, key=lambda x: x.CompletedAt or datetime.min, reverse=True)[:15]
        ],
        "description": f"You have completed {len(exam_sessions)} exams with an average score of {avg_exam_score}% "
                       f"({_get_letter_grade(avg_exam_score, grade_scale).get('grade', 'N/A') if exam_scores else 'N/A'})."
    }

    # ── 4. ESLCE SECTION (Grade 12 only) ──
    eslce_data = None
    if is_grade_12:
        try:
            from models.EslceStudentSession import EslceStudentSession
            eslce_sessions = db.query(EslceStudentSession).filter(
                EslceStudentSession.student_id == student_id,
                EslceStudentSession.completed_at.isnot(None)
            ).all()

            eslce_scores = [float(s.percentage) for s in eslce_sessions if s.percentage is not None]
            eslce_cfg = config.get("eslce_config", {})
            pass_threshold = eslce_cfg.get("passThreshold", 70)
            eslce_grade_scale = eslce_cfg.get("gradeScale", [])
            pass_count = sum(1 for s in eslce_scores if s >= pass_threshold)
            fail_count = len(eslce_scores) - pass_count

            by_subject = {}
            for s in eslce_sessions:
                subj = s.subject_name or "Unknown"
                if subj not in by_subject:
                    by_subject[subj] = {"scores": [], "count": 0}
                by_subject[subj]["count"] += 1
                if s.percentage is not None:
                    by_subject[subj]["scores"].append(float(s.percentage))

            subject_summary = []
            for subj, data in by_subject.items():
                scores = data["scores"]
                avg = round(sum(scores) / max(len(scores), 1), 1) if scores else 0
                subject_summary.append({
                    "subject": subj,
                    "sessions": data["count"],
                    "averageScore": avg,
                    "bestScore": round(max(scores), 1) if scores else 0,
                    "letterGrade": _get_letter_grade(avg, eslce_grade_scale) if scores else None,
                    "passed": avg >= pass_threshold
                })

            eslce_data = {
                "totalSessions": len(eslce_sessions),
                "averageScore": round(sum(eslce_scores) / max(len(eslce_scores), 1), 1) if eslce_scores else 0,
                "bestScore": round(max(eslce_scores), 1) if eslce_scores else 0,
                "passCount": pass_count,
                "failCount": fail_count,
                "passRate": round(pass_count / max(len(eslce_scores), 1) * 100, 1),
                "passThreshold": pass_threshold,
                "bySubject": subject_summary,
                "recentSessions": [
                    {
                        "sessionId": s.id,
                        "subject": s.subject_name,
                        "examType": s.exam_type,
                        "mode": s.mode,
                        "percentage": float(s.percentage) if s.percentage else 0,
                        "correctCount": s.correct_count,
                        "wrongCount": s.wrong_count,
                        "unansweredCount": s.unanswered_count,
                        "completedAt": s.completed_at.isoformat() if s.completed_at else None,
                        "letterGrade": _get_letter_grade(float(s.percentage), eslce_grade_scale) if s.percentage else None
                    }
                    for s in sorted(eslce_sessions, key=lambda x: x.completed_at or datetime.min, reverse=True)[:15]
                ],
                "description": f"You have completed {len(eslce_sessions)} ESLCE practice sessions "
                               f"with an average of {round(sum(eslce_scores) / max(len(eslce_scores), 1), 1) if eslce_scores else 0}%. "
                               f"Pass rate: {round(pass_count / max(len(eslce_scores), 1) * 100, 1)}% (threshold: {pass_threshold}%)."
            }
        except Exception as e:
            print(f"[Evaluation] ESLCE data error: {e}")

    # ── 5. MASTERY SECTION ──
    mastery_records = db.query(StuSubjectMastery).filter(
        StuSubjectMastery.StudentID == student_id
    ).all()

    subject_mastery = []
    for m in mastery_records:
        current = float(m.CurrentScore) if m.CurrentScore else float(m.OverallScore or 0)
        baseline = float(m.BaselineScore) if m.BaselineScore else 0
        growth = float(m.GrowthDelta) if m.GrowthDelta else (current - baseline)
        subject_mastery.append({
            "textbookId": m.STBID,
            "currentScore": round(current, 1),
            "baselineScore": round(baseline, 1),
            "growthDelta": round(growth, 1),
            "strengthArea": m.StrengthArea,
            "weaknessArea": m.WeaknessArea,
            "masteryStatus": m.MasteryStatus,
            "questionsAttempted": m.TotalQuestionsAttempted,
            "correctAnswers": m.CorrectAnswers,
            "accuracy": round(float(m.CorrectAnswers or 0) / max(m.TotalQuestionsAttempted or 1, 1) * 100, 1),
            "growthIndex": round(float(m.GrowthIndex) if m.GrowthIndex else 0, 2),
            "letterGrade": _get_letter_grade(current, grade_scale)
        })

    overall_mastery = round(
        sum(s["currentScore"] for s in subject_mastery) / max(len(subject_mastery), 1), 1
    ) if subject_mastery else 0

    mastery_data = {
        "overallMastery": overall_mastery,
        "overallLetterGrade": _get_letter_grade(overall_mastery, grade_scale),
        "subjects": sorted(subject_mastery, key=lambda x: x["currentScore"], reverse=True),
        "strongestSubject": subject_mastery[0] if subject_mastery else None,
        "weakestSubject": min(subject_mastery, key=lambda x: x["currentScore"]) if subject_mastery else None,
        "totalQuestionsAttempted": sum(s["questionsAttempted"] or 0 for s in subject_mastery),
        "totalCorrectAnswers": sum(s["correctAnswers"] or 0 for s in subject_mastery),
        "description": f"You are studying {len(subject_mastery)} subject(s) with an overall mastery of {overall_mastery}%."
    }

    # ── 6. METRICS SECTION ──
    metrics = db.query(StudentMetrics).filter(StudentMetrics.StudentID == student_id).first()
    metrics_mv = db.query(StudentMetricsMv).filter(StudentMetricsMv.StudentID == student_id).first()

    if metrics:
        accuracy = float(metrics.Accuracy) if metrics.Accuracy else 0
        avg_response_time = float(metrics.AvgResponseTimeSeconds) if metrics.AvgResponseTimeSeconds else 0
        consistency = float(metrics.Consistency) if metrics.Consistency else 0
        completion_rate = float(metrics.CompletionRate) if metrics.CompletionRate else 0
    else:
        accuracy = round(avg_quiz_score / 100, 4) if quiz_scores else 0
        avg_response_time = round(quiz_total_time / max(quiz_total_questions, 1), 1)
        consistency = 0.5 if quiz_scores else 0
        completion_rate = round(len(quiz_sessions) / max(len(quiz_sessions) + 2, 1), 4)

    if metrics_mv:
        improvement_rate = float(metrics_mv.ImprovementRatePerDay) if metrics_mv.ImprovementRatePerDay else 0
        overall_mastery_pct = float(metrics_mv.OverallMasteryPercent) if metrics_mv.OverallMasteryPercent else overall_mastery
        total_study_hrs = float(metrics_mv.TotalStudyHours) if metrics_mv.TotalStudyHours else study_data["totalStudyHours"]
    else:
        improvement_rate = 0
        overall_mastery_pct = overall_mastery
        total_study_hrs = study_data["totalStudyHours"]

    risk_score = _compute_risk(accuracy, consistency, completion_rate, overall_mastery_pct / 100, avg_response_time, risk_formula_cfg)
    risk_pct = round(risk_score * 100, 1)

    velocity = "Steady"
    if improvement_rate > 2.0:
        velocity = "Accelerating"
    elif improvement_rate < 0.5:
        velocity = "Declining"

    stability = "Stable"
    if consistency < 0.4:
        stability = "Volatile"
    elif consistency >= 0.8:
        stability = "Very Stable"

    status = "OnTrack"
    if risk_score >= 0.8:
        status = "HighRisk"
    elif risk_score >= 0.6:
        status = "AtRisk"

    metrics_data = {
        "accuracy": {"value": round(accuracy * 100, 1), "label": _get_score_label(accuracy * 100, thresholds, "default")},
        "consistency": {"value": round(consistency * 100, 1), "label": _get_score_label(consistency * 100, thresholds, "default")},
        "responseTime": {"value": round(avg_response_time, 1), "label": _get_score_label(avg_response_time, thresholds, "responseTime")},
        "completion": {"value": round(completion_rate * 100, 1), "label": _get_score_label(completion_rate * 100, thresholds, "default")},
        "mastery": {"value": round(overall_mastery_pct, 1), "label": _get_score_label(overall_mastery_pct, thresholds, "default")},
        "improvement": {"value": round(improvement_rate, 2), "label": _get_score_label(improvement_rate, thresholds, "improvement")},
        "risk": {"value": risk_pct, "label": _get_score_label(risk_pct, thresholds, "risk")},
        "velocity": velocity,
        "stability": stability,
        "status": status,
        "description": f"Your overall risk score is {risk_pct}% ({status.replace('HighRisk','High Risk').replace('AtRisk','At Risk').replace('OnTrack','On Track')}). "
                       f"You are {velocity.lower()} at {stability.lower()} pace."
    }

    # ── 7. RECOMMENDATIONS ──
    recommendations = []
    if accuracy * 100 < 60:
        recommendations.append({
            "priority": "high",
            "area": "Accuracy",
            "message": "Your accuracy is below 60%. Focus on reviewing material before taking quizzes.",
            "actions": ["Review textbook chapters before quizzing", "Study flashcards on weak topics", "Ask for help on confusing concepts"]
        })
    if consistency < 0.5:
        recommendations.append({
            "priority": "high",
            "area": "Consistency",
            "message": "Your scores vary significantly. Establish a regular study routine.",
            "actions": ["Study at the same time each day", "Take short breaks between sessions", "Set a consistent study schedule"]
        })
    if completion_rate < 0.7:
        recommendations.append({
            "priority": "medium",
            "area": "Completion",
            "message": "You often leave quizzes unfinished. Try to complete every quiz you start.",
            "actions": ["Start with shorter quizzes", "Push through difficult questions", "Take breaks if frustrated"]
        })
    if overall_mastery_pct < 60:
        recommendations.append({
            "priority": "high",
            "area": "Mastery",
            "message": "Your mastery level needs improvement. Build stronger foundations.",
            "actions": ["Master easy topics first", "Use spaced repetition", "Take practice exams"]
        })
    if avg_response_time > 45:
        recommendations.append({
            "priority": "medium",
            "area": "Speed",
            "message": "Your response time is slow. Practice under timed conditions.",
            "actions": ["Practice with a timer", "Skip difficult questions and return", "Study more to reduce hesitation"]
        })
    if improvement_rate < 0.5:
        recommendations.append({
            "priority": "medium",
            "area": "Improvement",
            "message": "Your improvement rate is low. Try different study methods.",
            "actions": ["Use active recall", "Teach concepts to others", "Track weak areas"]
        })
    if study_data["totalSessions"] == 0:
        recommendations.append({
            "priority": "high",
            "area": "Study",
            "message": "You have not started studying yet. Begin with your textbooks!",
            "actions": ["Open a textbook and start reading", "Take notes as you study", "Set a daily study goal"]
        })

    if not recommendations:
        recommendations.append({
            "priority": "low",
            "area": "Keep Going",
            "message": "You are performing well! Maintain your current study habits.",
            "actions": ["Continue your current routine", "Try harder quiz difficulties", "Help classmates with their studies"]
        })

    # ── FINAL REPORT ──
    return {
        "student": {
            "studentId": student_id,
            "fullName": full_name,
            "gradeLevel": grade_level,
            "gender": student.StuGender,
            "subscriptionStatus": student.SubscriptionStatus,
            "reportingPerson": {
                "name": student.ReportingPersonName,
                "phone": student.ReportingPersonPhone,
                "relation": student.ReportingPersonRelation,
            } if student.ReportingPersonName or student.ReportingPersonPhone else None,
        },
        "reportGeneratedAt": datetime.utcnow().isoformat(),
        "study": study_data,
        "quizzes": quiz_data,
        "exams": exam_data,
        "eslce": eslce_data,
        "mastery": mastery_data,
        "metrics": metrics_data,
        "recommendations": recommendations,
        "overallGrade": _get_letter_grade(avg_quiz_score if quiz_scores else avg_exam_score, grade_scale),
    }
