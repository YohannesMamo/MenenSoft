from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from models.StudentInfo import StudentInfo

router = APIRouter()


# ─────────────────────────────────────────────────────────
# UPDATE REPORTING PERSON
# ─────────────────────────────────────────────────────────

@router.put("/api/evaluation/reporting-person")
def update_reporting_person(request: Request, body: dict, db: Session = Depends(get_db)):
    from routes.students import get_current_user_id
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    user_id = get_current_user_id(token=token, db=db)
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.ReportingPersonName = body.get("name", student.ReportingPersonName)
    student.ReportingPersonPhone = body.get("phone", student.ReportingPersonPhone)
    student.ReportingPersonRelation = body.get("relation", student.ReportingPersonRelation)
    db.commit()
    return {
        "success": True,
        "reportingPerson": {
            "name": student.ReportingPersonName,
            "phone": student.ReportingPersonPhone,
            "relation": student.ReportingPersonRelation,
        },
    }


# ─────────────────────────────────────────────────────────
# SMS REPORT FORMATTER
# ─────────────────────────────────────────────────────────

def _format_sms_report(report: dict) -> str:
    s = report.get("student", {})
    o = report.get("overallGrade", {})
    study = report.get("study", {})
    quizzes = report.get("quizzes", {})
    exams = report.get("exams", {})
    metrics = report.get("metrics", {})

    lines = [
        "MERP Student Report Card",
        f"Student: {s.get('fullName', 'N/A')}",
        f"Grade: {s.get('gradeLevel', 'N/A')}",
        f"Overall Grade: {o.get('grade', 'N/A')} ({o.get('label', '')})",
        "",
        "=== SUBJECT BREAKDOWN ===",
    ]

    study_by_subj = study.get("bySubject", [])
    quiz_by_tb = quizzes.get("byTextbook", [])
    exam_by_subj = exams.get("bySubject", [])
    mastery_subj = report.get("mastery", {}).get("subjects", [])

    all_subjects = set()
    for item in study_by_subj:
        all_subjects.add(item.get("subject", "Unknown"))
    for item in quiz_by_tb:
        all_subjects.add(item.get("textbookId", "Unknown"))
    for item in exam_by_subj:
        all_subjects.add(item.get("subject", "Unknown"))
    for item in mastery_subj:
        all_subjects.add(item.get("textbookId", "Unknown"))

    study_map = {x["subject"]: x for x in study_by_subj}
    quiz_map = {x["textbookId"]: x for x in quiz_by_tb}
    exam_map = {x["subject"]: x for x in exam_by_subj}
    mastery_map = {x["textbookId"]: x for x in mastery_subj}

    for subj in sorted(all_subjects):
        lines.append(f"\n-- {subj} --")
        st = study_map.get(subj)
        if st:
            lines.append(f"  Study: {st['sectionsCompleted']}/{st['sectionsStudied']} sections ({st['completionRate']}%), {st['studyMinutes']}min")
        qz = quiz_map.get(subj)
        if qz:
            lg = qz.get("letterGrade") or {}
            lines.append(f"  Quiz: Avg {qz['averageScore']}% ({lg.get('grade','') if lg else ''}), Best {qz['bestScore']}%, {qz['attempts']} attempts")
        ex = exam_map.get(subj)
        if ex:
            lg = ex.get("letterGrade") or {}
            lines.append(f"  Exam: Avg {ex['averageScore']}% ({lg.get('grade','') if lg else ''}), {ex['accuracy']}% accuracy")
        mt = mastery_map.get(subj)
        if mt:
            lg = mt.get("letterGrade") or {}
            lines.append(f"  Mastery: {mt['currentScore']}% ({lg.get('grade','') if lg else ''}), Growth: {mt.get('growthDelta',0):+.1f}%")

    lines.extend([
        "",
        "=== OVERALL STATS ===",
        f"Study Hours: {study.get('totalStudyHours', 0)}",
        f"Quizzes: {quizzes.get('totalSessions', 0)} (Avg: {quizzes.get('averageScore', 0)}%)",
        f"Exams: {exams.get('totalSessions', 0)} (Avg: {exams.get('averageScore', 0)}%)",
        f"Risk: {metrics.get('risk', {}).get('value', 0)}% ({metrics.get('status', 'N/A')})",
    ])

    recs = report.get("recommendations", [])
    if recs:
        lines.append("\n=== RECOMMENDATIONS ===")
        for r in recs[:3]:
            lines.append(f"[{r['priority'].upper()}] {r['message']}")

    report_date = report.get("reportGeneratedAt", "")[:10]
    lines.append(f"\nReport Date: {report_date}")
    lines.append("From MERP Student Assistant")

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────
# SEND SMS REPORT
# ─────────────────────────────────────────────────────────

@router.post("/api/evaluation/send-sms")
def send_report_sms(request: Request, body: dict, db: Session = Depends(get_db)):
    from routes.students import get_current_user_id
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    user_id = get_current_user_id(token=token, db=db)
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    phone = body.get("phone") or student.ReportingPersonPhone
    if not phone:
        raise HTTPException(status_code=400, detail="No phone number provided or configured")

    report_data = body.get("report")
    if not report_data:
        raise HTTPException(status_code=400, detail="Report data not provided")

    sms_text = _format_sms_report(report_data)

    try:
        from core.config import settings
        sms_provider = getattr(settings, "SMS_PROVIDER", "console")
        sms_api_key = getattr(settings, "SMS_API_KEY", "")
        sms_sender_id = getattr(settings, "SMS_SENDER_ID", "MERP")

        if sms_provider == "console":
            print(f"\n{'='*50}")
            print(f"[SMS REPORT] To: {phone}")
            print(f"[SMS REPORT] From: {sms_sender_id}")
            print(f"[SMS REPORT] Message:\n{sms_text}")
            print(f"{'='*50}\n")
            return {
                "success": True,
                "provider": "console",
                "phone": phone,
                "messageLength": len(sms_text),
                "messagePreview": sms_text[:200],
                "note": "SMS logged to console. Configure SMS_PROVIDER in settings for live delivery.",
            }

        elif sms_provider == "africastalking":
            import requests as http_requests
            url = "https://api.africastalking.com/version1/messaging"
            headers = {
                "apiKey": sms_api_key,
                "Content-Type": "application/x-www-form-urlencoded",
            }
            data = {
                "username": getattr(settings, "SMS_USERNAME", ""),
                "to": phone,
                "message": sms_text,
                "from": sms_sender_id,
            }
            resp = http_requests.post(url, headers=headers, data=data, timeout=30)
            result = resp.json()
            if resp.status_code == 201:
                return {"success": True, "provider": "africastalking", "phone": phone, "messageLength": len(sms_text)}
            else:
                raise HTTPException(status_code=502, detail=f"SMS provider error: {result}")

        elif sms_provider == "twilio":
            from twilio.rest import Client
            client = Client(sms_api_key, getattr(settings, "SMS_API_SECRET", ""))
            msg = client.messages.create(body=sms_text, from_=sms_sender_id, to=phone)
            return {"success": True, "provider": "twilio", "phone": phone, "messageSid": msg.sid, "messageLength": len(sms_text)}

        else:
            raise HTTPException(status_code=500, detail=f"Unknown SMS provider: {sms_provider}")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SMS ERROR] {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"SMS send failed: {str(e)}")
