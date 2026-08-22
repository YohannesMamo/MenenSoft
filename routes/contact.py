from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
import httpx
import os

router = APIRouter()

# 1. Define what the frontend should send
class ContactForm(BaseModel):
    name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/api/contact")
async def handle_contact_form(form_data: ContactForm, background_tasks: BackgroundTasks):
    # Retrieve your existing Brevo API key from environment variables
    BREVO_API_KEY = os.getenv("BREVO_API_KEY") 
    
    # ADD THESE LINES TO DEBUG
    print("--- BREVO KEY DEBUG ---")
    print(f"Key Found: {BREVO_API_KEY is not None}")


    if BREVO_API_KEY:
        print(f"Starts with: {BREVO_API_KEY[:12]}... (Length: {len(BREVO_API_KEY)})")
    print("------------------------")
    if not BREVO_API_KEY:
        raise HTTPException(status_code=500, detail="Email service configuration missing.")

    # 2. Structure the payload for Brevo's API v3
    brevo_url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    email_payload = {
        "sender": {"name": form_data.name, "email": "calebbenyofoni2@gmail.com"}, # Must be a Brevo verified sender
        "to": [{"email": "your_admin_email@domain.com", "name": "System Admin"}], # Where YOU want to receive the contact emails
        "replyTo": {"email": form_data.email, "name": form_data.name}, # So when you click 'Reply', it goes to the user
        "subject": f"Contact Form: {form_data.subject}",
        "textContent": f"Message from {form_data.name} ({form_data.email}):\n\n{form_data.message}"
    }

    # 3. Send it off asynchronously so the frontend doesn't hang
    async def send_email():
        async with httpx.AsyncClient() as client:
            response = await client.post(brevo_url, json=email_payload, headers=headers)
            if response.status_code >= 400:
                print(f"Brevo Error: {response.text}")

    background_tasks.add_task(send_email)
    
    return {"status": "success", "message": "Your message has been received."}