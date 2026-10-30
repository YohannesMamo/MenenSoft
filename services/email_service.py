"""Transactional email delivery.

Emails are sent through the Brevo HTTP API (HTTPS / port 443) by default.
SMTP is kept only as a fallback because most PaaS hosts (Render free tier,
Railway, DigitalOcean, Heroku, ...) block outbound SMTP ports 25/465/587.
Blocked SMTP connections fail *before* reaching Brevo, which is why failed
verification / password-reset emails never appeared in the Brevo logs.
"""

import logging
import os
import smtplib
import ssl
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Used when FRONTEND_URL is missing or still points at localhost in production,
# otherwise every verification / reset link in the email would be unusable.
DEFAULT_PUBLIC_APP_URL = "https://menenoshs.onrender.com"

# Brevo's fallback submission port. Unlike 587 it is not blocked by most hosts.
SMTP_FALLBACK_PORTS = (2525,)


class EmailService:
    def __init__(self):
        self.brevo_api_key = self._env("BREVO_API_KEY")
        self.brevo_api_url = self._env(
            "BREVO_API_URL", "https://api.brevo.com/v3/smtp/email"
        )

        self.smtp_host = self._env("SMTP_HOST", "smtp-relay.brevo.com")
        self.smtp_port = int(self._env("SMTP_PORT", "587"))
        self.smtp_username = self._env("SMTP_USERNAME")
        self.smtp_password = self._env("SMTP_PASSWORD")

        self.from_email = self._env("FROM_EMAIL") or self.smtp_username
        self.app_name = self._env("APP_NAME", "MERP Student Assistant")
        self.from_name = self._env("FROM_NAME") or self.app_name

        # Where contact-form messages are delivered. Must be a real mailbox.
        self.contact_recipient = (
            self._env("CONTACT_RECIPIENT_EMAIL")
            or self._env("ADMIN_EMAIL")
            or "calebbenyofoni2@gmail.com"
        )

        self.frontend_url = self._resolve_frontend_url()
        self.timeout = float(self._env("EMAIL_TIMEOUT", "15"))

    @staticmethod
    def _env(name: str, default: Optional[str] = None) -> Optional[str]:
        """Read an env var, trimming stray whitespace/newlines.

        Values copied into hosting dashboards often keep a trailing space,
        which makes e.g. FROM_EMAIL invalid and gets the mail rejected.
        """
        value = os.getenv(name)
        if value is None:
            return default
        value = value.strip()
        return value or default

    # ------------------------------------------------------------------
    # configuration helpers
    # ------------------------------------------------------------------
    @property
    def is_configured(self) -> bool:
        return bool(
            self.from_email
            and (self.brevo_api_key or (self.smtp_username and self.smtp_password))
        )

    def _resolve_frontend_url(self) -> str:
        """Return a usable public app URL for links inside emails."""
        raw = (self._env("PUBLIC_APP_URL") or self._env("FRONTEND_URL") or "").strip()
        environment = (self._env("ENVIRONMENT") or "").lower()
        allow_local = environment in ("development", "dev", "local", "test", "testing")

        is_local = (not raw) or ("localhost" in raw) or ("127.0.0.1" in raw)
        if is_local and not allow_local:
            logger.warning(
                "FRONTEND_URL is localhost/missing while ENVIRONMENT=%r; using %s "
                "for email links. Set FRONTEND_URL (or PUBLIC_APP_URL) to the "
                "public app URL.",
                environment or "unset",
                DEFAULT_PUBLIC_APP_URL,
            )
            raw = DEFAULT_PUBLIC_APP_URL

        return (raw or "http://localhost:5173").rstrip("/")

    # ------------------------------------------------------------------
    # core sending
    # ------------------------------------------------------------------
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        reply_to: Optional[dict] = None,
        to_name: Optional[str] = None,
    ) -> bool:
        """Send one email. Returns True only when the provider accepted it."""
        if not self.from_email:
            logger.error("Email not sent: FROM_EMAIL / SMTP_USERNAME is not configured.")
            return False

        plain_text = text_content or self._html_to_text(html_content)

        if self.brevo_api_key:
            if self._send_via_brevo_api(
                to_email, subject, html_content, plain_text, reply_to, to_name
            ):
                return True
            logger.warning("Brevo API delivery failed, trying SMTP fallback...")

        if self.smtp_username and self.smtp_password:
            return self._send_via_smtp(
                to_email, subject, html_content, plain_text, reply_to
            )

        logger.error(
            "Email not sent to %s: no working transport configured "
            "(Brevo API key missing/invalid and SMTP credentials missing).",
            to_email,
        )
        return False

    def _send_via_brevo_api(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        reply_to: Optional[dict],
        to_name: Optional[str],
    ) -> bool:
        payload = {
            # The sender must be a verified Brevo sender, so it never comes from
            # user input (that was silently rejected before).
            "sender": {"name": self.from_name, "email": self.from_email},
            "to": [{"email": to_email, **({"name": to_name} if to_name else {})}],
            "subject": subject,
            "htmlContent": html_content,
            "textContent": text_content,
        }
        if reply_to and reply_to.get("email"):
            payload["replyTo"] = reply_to

        headers = {
            "accept": "application/json",
            "api-key": self.brevo_api_key,
            "content-type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(self.brevo_api_url, json=payload, headers=headers)

            if response.status_code in (200, 201, 202):
                try:
                    message_id = response.json().get("messageId")
                except Exception:
                    message_id = None
                logger.info(
                    "Email accepted by Brevo API: to=%s subject=%r messageId=%s",
                    to_email,
                    subject,
                    message_id,
                )
                return True

            logger.error(
                "Brevo API rejected email to %s (HTTP %s): %s",
                to_email,
                response.status_code,
                response.text[:500],
            )
            return False
        except Exception as exc:  # network errors, timeouts, ...
            logger.error("Brevo API request failed for %s: %s", to_email, exc)
            return False

    def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        reply_to: Optional[dict],
    ) -> bool:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = formataddr((self.from_name, self.from_email))
        msg["To"] = to_email
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=self.from_email.split("@")[-1])
        if reply_to and reply_to.get("email"):
            msg["Reply-To"] = formataddr(
                (reply_to.get("name") or "", reply_to["email"])
            )

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        ports = [self.smtp_port]
        if self.smtp_port in (25, 465, 587):
            ports.extend(p for p in SMTP_FALLBACK_PORTS if p not in ports)

        last_error = None
        for port in ports:
            try:
                if port == 465:
                    with smtplib.SMTP_SSL(
                        self.smtp_host, port, timeout=self.timeout,
                        context=ssl.create_default_context(),
                    ) as server:
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(self.smtp_host, port, timeout=self.timeout) as server:
                        server.ehlo()
                        server.starttls(context=ssl.create_default_context())
                        server.ehlo()
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)

                logger.info(
                    "Email accepted by SMTP (%s:%s): to=%s subject=%r",
                    self.smtp_host, port, to_email, subject,
                )
                return True
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "SMTP send via %s:%s failed for %s: %s",
                    self.smtp_host, port, to_email, exc,
                )

        logger.error(
            "All SMTP attempts failed for %s: %s. If this runs on a hosting "
            "provider, outbound SMTP ports are probably blocked - configure a "
            "valid BREVO_API_KEY instead.",
            to_email,
            last_error,
        )
        return False

    @staticmethod
    def _html_to_text(html: str) -> str:
        import re

        text = re.sub(r"(?is)<(script|style).*?</\1>", " ", html)
        text = re.sub(r"(?i)<br\s*/?>", "\n", text)
        text = re.sub(r"(?i)</p>", "\n\n", text)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
        return text.strip()

    # ------------------------------------------------------------------
    # public templates
    # ------------------------------------------------------------------
    def send_verification_email(self, email: str, token: str) -> bool:
        """Send email verification link"""
        verification_link = f"{self.frontend_url}/verify-email?token={token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #4F46E5; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #4F46E5; color: white;
                          text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Verify Your Email</h1>
                </div>
                <div class="content">
                    <h2>Welcome to {self.app_name}!</h2>
                    <p>Please verify your email address to complete your registration.</p>
                    <p>Click the button below to verify your email:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        {verification_link}
                    </p>
                    <p><strong>Note:</strong> This link will expire in 24 hours.</p>
                </div>
                <div class="footer">
                    <p>If you didn't create an account with {self.app_name}, please ignore this email.</p>
                    <p>&copy; {self.app_name} {datetime.now().year}</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = (
            f"Welcome to {self.app_name}!\n\n"
            "Please verify your email address to complete your registration.\n\n"
            f"Verify your email: {verification_link}\n\n"
            "This link will expire in 24 hours.\n\n"
            f"If you didn't create an account with {self.app_name}, please ignore this email.\n"
        )

        return self.send_email(
            email,
            f"Verify Your Email - {self.app_name}",
            html_content,
            text_content=text_content,
        )

    def send_password_reset_email(self, email: str, token: str) -> bool:
        """Send password reset link"""
        reset_link = f"{self.frontend_url}/reset-password?token={token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #EF4444; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 30px; background: #f9f9f9; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #EF4444; color: white;
                          text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
                .warning {{ background: #FEF3C7; padding: 15px; border-radius: 5px; border-left: 4px solid #F59E0B; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Reset Your Password</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>We received a request to reset your password for {self.app_name}.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background: #eee; padding: 10px; border-radius: 5px;">
                        {reset_link}
                    </p>
                    <div class="warning">
                        <p><strong>⚠️ Security Note:</strong></p>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request this password reset, please ignore this email.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; {self.app_name} {datetime.now().year}</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = (
            f"We received a request to reset your password for {self.app_name}.\n\n"
            f"Reset your password: {reset_link}\n\n"
            "This link will expire in 1 hour.\n\n"
            "If you didn't request this password reset, please ignore this email.\n"
        )

        return self.send_email(
            email,
            f"Reset Your Password - {self.app_name}",
            html_content,
            text_content=text_content,
        )

    def send_contact_message(
        self,
        name: str,
        email: str,
        subject: str,
        message: str,
        recipient: Optional[str] = None,
    ) -> bool:
        """Send a contact-form submission to the admin mailbox."""
        to_email = recipient or self.contact_recipient

        safe_message = (
            message.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        ).replace("\n", "<br>")

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">New contact form message</h2>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Subject:</strong> {subject}</p>
                <hr>
                <p>{safe_message}</p>
            </div>
        </body>
        </html>
        """

        text_content = (
            f"New contact form message\n\n"
            f"Name: {name}\n"
            f"Email: {email}\n"
            f"Subject: {subject}\n\n"
            f"{message}\n"
        )

        return self.send_email(
            to_email,
            f"Contact Form: {subject}",
            html_content,
            text_content=text_content,
            reply_to={"email": email, "name": name},
            to_name="System Admin",
        )
