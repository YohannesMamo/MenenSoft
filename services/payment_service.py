import httpx
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from core.config import settings
from models.user import user as userModel
from models.StudentInfo import StudentInfo
from models.StuSubscription import StuSubscription
from models.PaymentVerification import PaymentVerification

logger = logging.getLogger(__name__)

VALID_PLANS = {
    "monthly": {"amount": 100, "label": "Monthly (100 ETB)"},
    "yearly": {"amount": 1000, "label": "Yearly (1000 ETB)"},
}


def verify_transaction(reference: str) -> dict:
    """Call Veritas API to verify a payment reference. Returns {ok, provider, data, error}."""
    if not settings.VERIFIER_API_KEY:
        return {"ok": False, "provider": None, "data": None, "error": "Verifier API key not configured"}

    payload = {"reference": reference.strip()}

    try:
        resp = httpx.post(
            f"{settings.VERIFIER_BASE_URL}/verify",
            json=payload,
            headers={
                "x-api-key": settings.VERIFIER_API_KEY,
                "Content-Type": "application/json",
            },
            timeout=settings.VERIFIER_TIMEOUT,
        )

        if resp.status_code == 429:
            retry_after = resp.headers.get("retry-after", "60")
            return {"ok": False, "provider": None, "data": None, "error": f"Rate limited. Retry after {retry_after}s"}

        if resp.status_code == 401:
            return {"ok": False, "provider": None, "data": None, "error": "Invalid Verifier API key"}

        if resp.status_code >= 500:
            return {"ok": False, "provider": None, "data": None, "error": "Verifier API server error"}

        data = resp.json()
        return {
            "ok": data.get("ok", False),
            "provider": data.get("provider", "unknown"),
            "data": data.get("data", {}),
            "error": data.get("error"),
        }

    except httpx.TimeoutException:
        return {"ok": False, "provider": None, "data": None, "error": "Verifier API request timed out"}
    except httpx.ConnectError:
        return {"ok": False, "provider": None, "data": None, "error": "Cannot connect to Verifier API"}
    except Exception as e:
        logger.exception("Unexpected error during payment verification")
        return {"ok": False, "provider": None, "data": None, "error": str(e)}


def upgrade_to_premium(user_id: str, db: Session) -> bool:
    """Set StudentInfo.SubscriptionStatus='Premium' and user.is_paid=True. Returns True if upgraded."""
    user = db.query(userModel).filter(userModel.UserID == user_id).first()
    if not user:
        return False

    if user.is_paid:
        return True

    user.is_paid = True

    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if student:
        student.SubscriptionStatus = "Premium"
        student.UpdatedAt = datetime.utcnow()

    db.commit()
    return True


def record_payment(
    user_id: str,
    reference: str,
    provider: str,
    amount,
    status: str,
    raw_response: dict,
    payer_name: str = None,
    receiver_name: str = None,
    currency: str = "ETB",
    db: Session = None,
) -> PaymentVerification:
    """Save a PaymentVerification row and a StuSubscription row."""
    pv = PaymentVerification(
        user_id=user_id,
        reference=reference,
        provider=provider,
        status=status,
        amount=amount,
        currency=currency,
        payer_name=payer_name,
        receiver_name=receiver_name,
        raw_response=raw_response,
    )
    db.add(pv)
    db.flush()

    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if student and amount:
        sub = StuSubscription(
            StudentID=student.StudentID,
            SubscriptionDate=datetime.utcnow(),
            PaymentAmount=float(amount),
            SubscriptionDocumentID=reference,
            CreatedAt=datetime.utcnow(),
            PaymentType=provider or "unknown",
        )
        db.add(sub)

    db.commit()
    db.refresh(pv)
    return pv


def check_subscription_status(user_id: str, db: Session) -> dict:
    """Return {status, plan, since} based on StudentInfo.SubscriptionStatus."""
    student = db.query(StudentInfo).filter(StudentInfo.UserID == user_id).first()
    if not student:
        return {"status": "Free", "plan": None, "since": None}

    status = student.SubscriptionStatus or "Free"
    if status == "Free":
        return {"status": "Free", "plan": None, "since": None}

    latest_sub = (
        db.query(StuSubscription)
        .filter(StuSubscription.StudentID == student.StudentID)
        .order_by(StuSubscription.SubscriptionDate.desc())
        .first()
    )

    return {
        "status": status,
        "plan": "Premium",
        "since": latest_sub.SubscriptionDate.isoformat() if latest_sub and latest_sub.SubscriptionDate else None,
    }


def get_payment_history(user_id: str, db: Session) -> list:
    """Return all payment verification records for a user."""
    records = (
        db.query(PaymentVerification)
        .filter(PaymentVerification.user_id == user_id)
        .order_by(PaymentVerification.created_at.desc())
        .all()
    )
    return [
        {
            "reference": r.reference,
            "status": r.status,
            "provider": r.provider,
            "amount": float(r.amount) if r.amount else None,
            "currency": r.currency,
            "payerName": r.payer_name,
            "receiverName": r.receiver_name,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]
