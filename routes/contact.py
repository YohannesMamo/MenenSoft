import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from services.email_service import EmailService

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactForm(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1, max_length=5000)


@router.post("/api/contact")
def handle_contact_form(form_data: ContactForm):
    """Deliver a contact-form submission to the admin mailbox.

    Runs synchronously (in FastAPI's threadpool) so the response reflects the
    real delivery result instead of always reporting success.
    """
    email_service = EmailService()

    if not email_service.is_configured:
        logger.error("Contact form failed: email transport is not configured.")
        raise HTTPException(
            status_code=500, detail="Email service configuration missing."
        )

    sent = email_service.send_contact_message(
        name=form_data.name.strip(),
        email=form_data.email,
        subject=form_data.subject.strip(),
        message=form_data.message.strip(),
    )

    if not sent:
        logger.error("Contact form delivery failed for sender %s", form_data.email)
        raise HTTPException(
            status_code=502,
            detail=(
                "We couldn't send your message right now. "
                "Please try again later or email us directly."
            ),
        )

    return {"status": "success", "message": "Your message has been received."}
