import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from core.config import settings
from models.user import user as userModel
from models.PaymentVerification import PaymentVerification

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


# ── Request / Response schemas ──

class VerifyRequest(BaseModel):
    reference: str
    suffix: Optional[str] = None
    provider: Optional[str] = None


class WebhookPayload(BaseModel):
    reference: str
    status: Optional[str] = None
    amount: Optional[float] = None
    provider: Optional[str] = None
    suffix: Optional[str] = None
    signature: Optional[str] = None


# ── POST /api/payments/verify ──

@router.post("/verify")
async def verify_payment(
    body: VerifyRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    if not settings.VERIFIER_API_KEY:
        raise HTTPException(status_code=500, detail="Verifier API key not configured")

    if not body.reference or not body.reference.strip():
        raise HTTPException(status_code=400, detail="Payment reference is required")

    payload = {"reference": body.reference.strip()}
    if body.suffix:
        payload["suffix"] = body.suffix.strip()

    try:
        async with httpx.AsyncClient(timeout=settings.VERIFIER_TIMEOUT) as client:
            resp = await client.post(
                f"{settings.VERIFIER_BASE_URL}/verify",
                json=payload,
                headers={
                    "x-api-key": settings.VERIFIER_API_KEY,
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 429:
            retry_after = resp.headers.get("retry-after", "60")
            raise HTTPException(
                status_code=429,
                detail=f"Rate limited by Verifier API. Retry after {retry_after}s",
            )

        if resp.status_code == 401:
            raise HTTPException(status_code=500, detail="Invalid Verifier API key")

        if resp.status_code >= 500:
            raise HTTPException(status_code=502, detail="Verifier API server error")

        data = resp.json()

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Verifier API request timed out")
    except httpx.ConnectError:
        raise HTTPException(status_code=502, detail="Cannot connect to Verifier API")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during payment verification")
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")

    verified = data.get("ok", False)
    provider = data.get("provider", body.provider or "unknown")
    tx_data = data.get("data", {})
    error_msg = data.get("error")

    amount = tx_data.get("amount") or tx_data.get("totalAmount")
    payer_name = tx_data.get("payerName") or tx_data.get("senderName")
    receiver_name = tx_data.get("receiverName")
    currency = tx_data.get("currency", "ETB")

    status = "verified" if verified else "failed"

    record = PaymentVerification(
        user_id=user_id,
        reference=body.reference.strip(),
        provider=provider,
        status=status,
        amount=amount,
        currency=currency,
        payer_name=payer_name,
        receiver_name=receiver_name,
        raw_response=data,
    )
    db.add(record)

    if verified:
        user = db.query(userModel).filter(userModel.UserID == user_id).first()
        if user:
            user.is_paid = True

    db.commit()
    db.refresh(record)

    return {
        "success": verified,
        "status": status,
        "amount": float(amount) if amount else None,
        "provider": provider,
        "payerName": payer_name,
        "receiverName": receiver_name,
        "reference": body.reference.strip(),
        "error": error_msg if not verified else None,
    }


# ── POST /api/payments/webhook ──

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
        user = (
            db.query(userModel)
            .filter(userModel.UserID == record.user_id)
            .first()
        )
        if user:
            user.is_paid = True

    db.commit()

    return {"received": True, "reference": body.reference}


# ── GET /api/payments/status/{reference} ──

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
