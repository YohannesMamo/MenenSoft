import httpx
import logging
import uuid
import hashlib
import base64
from datetime import datetime
from sqlalchemy.orm import Session

from core.config import settings
from models.PaymentVerification import PaymentVerification

logger = logging.getLogger(__name__)

PLAN_AMOUNTS = {
    "monthly": 100,
    "yearly": 1000,
}


def generate_reference(prefix: str = "MERP") -> str:
    """Generate a unique payment reference."""
    short_id = uuid.uuid4().hex[:8].upper()
    return f"{prefix}-{short_id}"


async def initiate_telebirr_payment(
    amount: float,
    reference: str,
    user_id: str,
    phone_number: str = "",
    description: str = "Premium Subscription",
) -> dict:
    """
    Create a Telebirr payment request.
    Returns {success, paymentUrl, checkoutRequestId, error}.
    """
    if not settings.TELEBIRR_APP_ID or not settings.TELEBIRR_APP_KEY:
        return {
            "success": False,
            "error": "Telebirr is not configured. Please contact administrator.",
            "paymentUrl": None,
        }

    payload = {
        "appId": settings.TELEBIRR_APP_ID,
        "appKey": settings.TELEBIRR_APP_KEY,
        "receiveName": "MERP Student Assist",
        "amount": str(int(amount)),
        "subject": description,
        "body": f"Payment for {description} - Ref: {reference}",
        "outTradeNo": reference,
        "notifyUrl": settings.TELEBIRR_CALLBACK_URL or f"{settings.BACKEND_URL}/api/payments/callback/telebirr",
        "returnUrl": f"{settings.FRONTEND_URL}/payment/result",
        "timeoutExpress": "30",
        "multiProduct": [
            {
                "body": description,
                "outTradeNo": reference,
                "price": str(int(amount)),
                "quantity": "1",
                "title": "Premium Subscription",
            }
        ],
    }

    if phone_number:
        payload["payerPhone"] = phone_number

    try:
        auth_str = f"{settings.TELEBIRR_APP_ID}:{settings.TELEBIRR_APP_KEY}"
        auth_token = base64.b64encode(auth_str.encode()).decode()

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.TELEBIRR_API_URL}/v1/requestPayment",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {auth_token}",
                },
            )

        data = resp.json()

        if data.get("code") == 200:
            short_code = data.get("shortCode") or data.get("data", {}).get("shortCode", "")
            to_pay = data.get("toPayUrl") or data.get("data", {}).get("toPayUrl", "")

            payment_url = to_pay or f"https://app.ethiomobilemoney.et/s/{short_code}"

            return {
                "success": True,
                "paymentUrl": payment_url,
                "checkoutRequestId": short_code,
                "error": None,
            }
        else:
            error_msg = data.get("message") or data.get("msg") or "Telebirr payment initiation failed"
            logger.warning(f"Telebirr error: {data}")
            return {
                "success": False,
                "paymentUrl": None,
                "error": error_msg,
            }

    except httpx.TimeoutException:
        return {"success": False, "paymentUrl": None, "error": "Payment gateway timed out"}
    except httpx.ConnectError:
        return {"success": False, "paymentUrl": None, "error": "Cannot connect to payment gateway"}
    except Exception as e:
        logger.exception("Telebirr payment initiation error")
        return {"success": False, "paymentUrl": None, "error": str(e)}


async def initiate_cbe_payment(
    amount: float,
    reference: str,
    user_id: str,
    phone_number: str = "",
    description: str = "Premium Subscription",
) -> dict:
    """
    Create a CBE Birr payment request.
    Returns {success, paymentUrl, orderId, error}.
    """
    if not settings.CBE_MERCHANT_CODE or not settings.CBE_API_KEY:
        return {
            "success": False,
            "error": "CBE Birr is not configured. Please contact administrator.",
            "paymentUrl": None,
        }

    payload = {
        "merchantCode": settings.CBE_MERCHANT_CODE,
        "totalAmount": str(int(amount)),
        "currency": "ETB",
        "orderId": reference,
        "description": description,
        "callbackUrl": settings.CBE_CALLBACK_URL or f"{settings.BACKEND_URL}/api/payments/callback/cbe",
        "returnUrl": f"{settings.FRONTEND_URL}/payment/result",
    }

    if phone_number:
        payload["accountNumber"] = phone_number

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.CBE_API_URL}/v1/payment/request",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.CBE_API_KEY}",
                },
            )

        data = resp.json()

        if data.get("code") in (200, "200", 0):
            payment_url = data.get("paymentUrl") or data.get("data", {}).get("paymentUrl", "")
            order_id = data.get("orderId") or data.get("data", {}).get("orderId", reference)

            return {
                "success": True,
                "paymentUrl": payment_url,
                "orderId": order_id,
                "error": None,
            }
        else:
            error_msg = data.get("message") or data.get("msg") or "CBE payment initiation failed"
            logger.warning(f"CBE error: {data}")
            return {
                "success": False,
                "paymentUrl": None,
                "error": error_msg,
            }

    except httpx.TimeoutException:
        return {"success": False, "paymentUrl": None, "error": "Payment gateway timed out"}
    except httpx.ConnectError:
        return {"success": False, "paymentUrl": None, "error": "Cannot connect to payment gateway"}
    except Exception as e:
        logger.exception("CBE payment initiation error")
        return {"success": False, "paymentUrl": None, "error": str(e)}


def handle_gateway_callback(provider: str, payload: dict, db: Session) -> dict:
    """
    Process a webhook callback from Telebirr or CBE.
    Returns {success, reference, status}.
    """
    reference = payload.get("outTradeNo") or payload.get("orderId") or payload.get("reference", "")
    status_raw = payload.get("status") or payload.get("code") or payload.get("resultCode", "")

    status_str = str(status_raw).lower()
    if status_str in ("0", "200", "success", "completed", "paid", "successful"):
        status = "verified"
    elif status_str in ("1", "400", "failed", "cancelled", "timeout"):
        status = "failed"
    else:
        status = "pending"

    amount = payload.get("amount") or payload.get("totalAmount")

    record = (
        db.query(PaymentVerification)
        .filter(PaymentVerification.reference == reference)
        .order_by(PaymentVerification.created_at.desc())
        .first()
    )

    if record:
        record.status = status
        if amount:
            record.amount = float(amount)
        record.raw_response = payload
    else:
        record = PaymentVerification(
            user_id="webhook",
            reference=reference,
            provider=provider,
            status=status,
            amount=float(amount) if amount else None,
            raw_response=payload,
        )
        db.add(record)

    db.commit()

    return {
        "success": status == "verified",
        "reference": reference,
        "status": status,
    }
