from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from database import get_db
from models.StudentInfo import StudentInfo
from models.StudentMetrics import StudentMetrics
from models.StudentMetricsMv import StudentMetricsMv
from models.QuizSession import QuizSession
from models.ExamSession import ExamSession
from models.StudySession import StudySession
from models.StuSubjectMastery import StuSubjectMastery
from models.StuSectionProgress import StuSectionProgress
from models.GradesInfo import GradesInfo
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

@router.get("/learning-state")
def get_learning_state(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    print(f"[Students API] get_learning_state called for user_id: {user_id}")

    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_id = student.StudentID
    print(f"[Students API] Student ID: {student_id}")

    metrics = db.query(StudentMetrics).filter(StudentMetrics.StudentID == student_id).first()
    metrics_mv = db.query(StudentMetricsMv).filter(StudentMetricsMv.StudentID == student_id).first()

    quiz_sessions = db.query(QuizSession).filter(
        QuizSession.StudentID == student_id,
        QuizSession.CompletedAt != None
    ).all()

    exam_sessions = db.query(ExamSession).filter(
        ExamSession.StudentID == student_id,
        ExamSession.CompletedAt != None
    ).all()

    study_sessions = db.query(StudySession).filter(
        StudySession.StudentID == student_id,
        StudySession.EndedAt != None
    ).all()

    subject_masteries = db.query(StuSubjectMastery).filter(
        StuSubjectMastery.StudentID == student_id
    ).all()

    if metrics_mv:
        total_study_hours = float(metrics_mv.TotalStudyHours) if metrics_mv.TotalStudyHours else 0.0
        improvement_rate = float(metrics_mv.ImprovementRatePerDay) if metrics_mv.ImprovementRatePerDay else 0.0
        overall_mastery = float(metrics_mv.OverallMasteryPercent) / 100.0 if metrics_mv.OverallMasteryPercent else 0.0
        avg_exam_score = float(metrics_mv.AvgExamScore) if metrics_mv.AvgExamScore else 0.0
        total_sessions = int(metrics_mv.TotalSessionsCompleted) if metrics_mv.TotalSessionsCompleted else 0
    else:
        total_study_hours = 0.0
        for ss in study_sessions:
            if ss.StartedAt and ss.EndedAt:
                duration = (ss.EndedAt - ss.StartedAt).total_seconds() / 3600
                total_study_hours += duration

        quiz_scores = [float(q.OverallScore) for q in quiz_sessions if q.OverallScore]
        exam_scores = [float(e.OverallScore) for e in exam_sessions if e.OverallScore]

        avg_exam_score = sum(exam_scores) / len(exam_scores) if exam_scores else 0.0

        mastery_scores = [float(s.CurrentScore) for s in subject_masteries if s.CurrentScore]
        overall_mastery = sum(mastery_scores) / len(mastery_scores) if mastery_scores else 0.0

        total_sessions = len(quiz_sessions) + len(exam_sessions)

        improvement_rate = 0.0
        if len(subject_masteries) >= 2:
            sorted_masteries = sorted(subject_masteries, key=lambda x: x.UpdatedAt or datetime.min)
            recent_masteries = sorted_masteries[-5:]
            if len(recent_masteries) >= 2:
                score_diffs = []
                for i in range(1, len(recent_masteries)):
                    if recent_masteries[i].UpdatedAt and recent_masteries[i-1].UpdatedAt:
                        days_diff = (recent_masteries[i].UpdatedAt - recent_masteries[i-1].UpdatedAt).days
                        if days_diff > 0 and recent_masteries[i].CurrentScore and recent_masteries[i-1].CurrentScore:
                            score_diff = float(recent_masteries[i].CurrentScore) - float(recent_masteries[i-1].CurrentScore)
                            score_diffs.append(score_diff / days_diff)
                if score_diffs:
                    improvement_rate = sum(score_diffs) / len(score_diffs) * 30

    if metrics:
        accuracy = float(metrics.Accuracy) if metrics.Accuracy else 0.0
        avg_response_time = float(metrics.AvgResponseTimeSeconds) if metrics.AvgResponseTimeSeconds else 0.0
        consistency = float(metrics.Consistency) if metrics.Consistency else 0.0
        completion_rate = float(metrics.CompletionRate) if metrics.CompletionRate else 0.0
        learning_gain = float(metrics.LearningGain) if metrics.LearningGain else 0.0
    else:
        accuracy = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0.0
        avg_response_time = 30.0
        consistency = 0.5 if total_sessions > 0 else 0.0
        completion_rate = 0.7 if total_sessions > 0 else 0.0
        learning_gain = improvement_rate / 100 if improvement_rate else 0.0

    risk_score = 0.5
    if accuracy < 0.6:
        risk_score += 0.15
    if avg_response_time > 45:
        risk_score += 0.1
    if consistency < 0.5:
        risk_score += 0.1
    if completion_rate < 0.7:
        risk_score += 0.1
    if overall_mastery < 0.6:
        risk_score += 0.05
    risk_score = min(risk_score, 1.0)

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

    response = {
        "studentId": student_id,
        "status": "OnTrack" if risk_score < 0.6 else ("AtRisk" if risk_score < 0.8 else "HighRisk"),
        "behavior": {
            "accuracy": accuracy,
            "avgResponseTimeSeconds": avg_response_time,
            "consistency": consistency,
            "completionRate": completion_rate,
            "learningGain": learning_gain
        },
        "progress": {
            "totalStudyHours": round(total_study_hours, 1),
            "avgExamScore": round(avg_exam_score, 2),
            "overallMasteryPercent": overall_mastery,
            "improvementRatePerDay": round(improvement_rate, 2),
            "totalSessionsCompleted": total_sessions
        },
        "computedSignals": {
            "riskScore": risk_score,
            "velocity": velocity,
            "stability": stability
        }
    }

    print(f"[Students API] Returning dynamic data for {student_id}")
    return response

@router.get("/interventions")
def get_interventions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    print(f"[Students API] get_interventions called for user_id: {user_id}")

    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_id = student.StudentID
    print(f"[Students API] Student ID: {student_id}")

    metrics = db.query(StudentMetrics).filter(StudentMetrics.StudentID == student_id).first()
    metrics_mv = db.query(StudentMetricsMv).filter(StudentMetricsMv.StudentID == student_id).first()

    quiz_sessions = db.query(QuizSession).filter(
        QuizSession.StudentID == student_id,
        QuizSession.CompletedAt != None
    ).all()

    subject_masteries = db.query(StuSubjectMastery).filter(
        StuSubjectMastery.StudentID == student_id
    ).all()

    quiz_scores = [float(q.OverallScore) for q in quiz_sessions if q.OverallScore]
    avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else 0.0

    if metrics_mv and metrics_mv.OverallMasteryPercent:
        avg_mastery = float(metrics_mv.OverallMasteryPercent) / 100.0
    else:
        mastery_scores = [float(s.CurrentScore) for s in subject_masteries if s.CurrentScore]
        avg_mastery = sum(mastery_scores) / len(mastery_scores) if mastery_scores else 0.0

    consistency = float(metrics.Consistency) if metrics and metrics.Consistency else 0.5
    avg_response_time = float(metrics.AvgResponseTimeSeconds) if metrics and metrics.AvgResponseTimeSeconds else 30.0

    signals = {
        "lowConsistency": consistency < 0.5,
        "slowResponse": avg_response_time > 40,
        "lowMastery": avg_mastery < 0.6
    }

    recommendations = []
    priority = 1

    if avg_mastery < 0.6:
        recommendations.append({
            "type": "Mastery",
            "topic": "Strengthen Weak Areas",
            "priority": priority
        })
        priority += 1

    if consistency < 0.5:
        recommendations.append({
            "type": "Practice",
            "topic": "Improve Consistency",
            "priority": priority
        })
        priority += 1

    if avg_response_time > 40:
        recommendations.append({
            "type": "Speed",
            "topic": "Improve Response Time",
            "priority": priority
        })
        priority += 1

    if avg_quiz_score < 60:
        recommendations.append({
            "type": "Review",
            "topic": "Review Key Concepts",
            "priority": priority
        })
        priority += 1

    if not recommendations:
        recommendations.append({
            "type": "Maintenance",
            "topic": "Keep Up the Good Work",
            "priority": 1
        })

    risk_level = "Low"
    risk_count = sum(1 for v in signals.values() if v)
    if risk_count >= 3:
        risk_level = "High"
    elif risk_count >= 1:
        risk_level = "Medium"

    response = {
        "studentId": student_id,
        "riskLevel": risk_level,
        "signals": signals,
        "recommendations": recommendations
    }

    print(f"[Students API] Returning interventions for {student_id}")
    return response


@router.get("/grades")
def get_grades(db: Session = Depends(get_db)):
  """Get available grades (Grades 9,10,11,12) for registration dropdown"""
  print(f"[Students API] get_grades called")
  # Filter to only grades 9-12
  grades = db.query(GradesInfo).all()
  filtered_grades = []
  
  for grade in grades:
    # Check if grade description or ID contains 9,10,11,12
    grade_str = str(grade.GradeID) + " " + str(grade.GradeDescription)
    if any(num in grade_str for num in ["9", "10", "11", "12"]):
      filtered_grades.append(grade)
  
  # If no grades found, return default grades (fallback)
  if not filtered_grades:
    return [
      {"gradeId": "HIG9A", "gradeDescription": "Grade 9"},
      {"gradeId": "HIG10A", "gradeDescription": "Grade 10"},
      {"gradeId": "HIG11A", "gradeDescription": "Grade 11"},
      {"gradeId": "HIG12A", "gradeDescription": "Grade 12"}
    ]
  
  return [
    {
      "gradeId": grade.GradeID,
      "gradeDescription": grade.GradeDescription
    }
    for grade in filtered_grades
  ]