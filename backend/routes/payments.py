import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from core.config import settings
from models.user import user as userModel
from models.PaymentVerification import PaymentVerification
from services.payment_service import (
    verify_transaction,
    upgrade_to_premium,
    record_payment,
    check_subscription_status,
    get_payment_history,
    VALID_PLANS,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

logger = logging.getLogger(__name__)

ALGORITHM = "HS256"


def get_current_user_id(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> str:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        user_record = db.query(userModel).filter(userModel.UserID == user_id).first()
        if not user_record or not user_record.is_active:
            raise HTTPException(status_code=401, detail="User not found or deactivated")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


class VerifyRequest(BaseModel):
    reference: str
    plan: Optional[str] = None


class WebhookPayload(BaseModel):
    reference: str
    status: Optional[str] = None
    amount: Optional[float] = None
    provider: Optional[str] = None
    suffix: Optional[str] = None
    signature: Optional[str] = None


# -- POST /api/payments/verify --

@router.post("/verify")
async def verify_and_upgrade(
    body: VerifyRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not body.reference or not body.reference.strip():
        raise HTTPException(status_code=400, detail="Payment reference is required")

    reference = body.reference.strip()

    existing = (
        db.query(PaymentVerification)
        .filter(
            PaymentVerification.user_id == user_id,
            PaymentVerification.reference == reference,
            PaymentVerification.status == "verified",
        )
        .first()
    )
    if existing:
        return {
            "success": True,
            "alreadyVerified": True,
            "message": "This reference has already been verified.",
            "reference": reference,
            "subscriptionStatus": "Premium",
        }

    result = verify_transaction(reference)

    if not result["ok"]:
        record = PaymentVerification(
            user_id=user_id,
            reference=reference,
            provider=result.get("provider"),
            status="failed",
            raw_response={"error": result["error"]},
        )
        db.add(record)
        db.commit()
        raise HTTPException(status_code=400, detail=result["error"] or "Payment verification failed")

    tx_data = result["data"] or {}
    amount = tx_data.get("amount") or tx_data.get("totalAmount")
    payer_name = tx_data.get("payerName") or tx_data.get("senderName")
    receiver_name = tx_data.get("receiverName")
    currency = tx_data.get("currency", "ETB")
    provider = result["provider"]

    upgrade_to_premium(user_id, db)

    record_payment(
        user_id=user_id,
        reference=reference,
        provider=provider,
        amount=amount,
        status="verified",
        raw_response=tx_data,
        payer_name=payer_name,
        receiver_name=receiver_name,
        currency=currency,
        db=db,
    )

    return {
        "success": True,
        "message": "Payment verified! Welcome to Premium.",
        "reference": reference,
        "amount": float(amount) if amount else None,
        "provider": provider,
        "payerName": payer_name,
        "receiverName": receiver_name,
        "subscriptionStatus": "Premium",
    }


# -- POST /api/payments/webhook --

@router.post("/webhook")
async def payment_webhook(
    body: WebhookPayload,
    db: Session = Depends(get_db),
):
    if not body.reference:
        raise HTTPException(status_code=400, detail="Reference is required in webhook payload")

    logger.info(f"Webhook received for reference: {body.reference}, status: {body.status}")

    record = (
        db.query(PaymentVerification)
        .filter(PaymentVerification.reference == body.reference)
        .order_by(PaymentVerification.created_at.desc())
        .first()
    )

    if record:
        record.status = body.status or record.status
        if body.amount:
            record.amount = body.amount
        if body.provider:
            record.provider = body.provider
    else:
        record = PaymentVerification(
            user_id="webhook",
            reference=body.reference,
            provider=body.provider,
            status=body.status or "verified",
            amount=body.amount,
            raw_response=body.dict(),
        )
        db.add(record)

    if body.status in ("verified", "success", "completed"):
        upgrade_to_premium(record.user_id, db)

    db.commit()

    return {"received": True, "reference": body.reference}


# -- GET /api/payments/subscription --

@router.get("/subscription")
async def get_subscription(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return check_subscription_status(user_id, db)


# -- GET /api/payments/plans --

@router.get("/plans")
async def get_plans():
    return {"plans": VALID_PLANS}


# -- GET /api/payments/history --

@router.get("/history")
async def get_history(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    return {"payments": get_payment_history(user_id, db)}


# -- GET /api/payments/status/{reference} --

@router.get("/status/{reference}")
async def get_payment_status(
    reference: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    record = (
        db.query(PaymentVerification)
        .filter(
            PaymentVerification.reference == reference,
            PaymentVerification.user_id == user_id,
        )
        .order_by(PaymentVerification.created_at.desc())
        .first()
    )

    if not record:
        return {
            "reference": reference,
            "status": "not_found",
            "message": "No verification record found for this reference",
        }

    return {
        "reference": record.reference,
        "status": record.status,
        "provider": record.provider,
        "amount": float(record.amount) if record.amount else None,
        "payerName": record.payer_name,
        "receiverName": record.receiver_name,
        "verified_at": record.created_at.isoformat() if record.created_at else None,
    }
