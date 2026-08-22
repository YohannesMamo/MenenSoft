# backend/email_service.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from typing import Optional
from datetime import datetime  # ✅ ADD THIS LINE
from dotenv import load_dotenv
load_dotenv()  # ✅ Make sure this is there


class EmailService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.app_name = os.getenv("APP_NAME", "MyApp")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:

        
        """Send an email using SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            return True
        except Exception as e:
            print(f"Email sending failed: {str(e)}")
            return False
    
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
        
        return self.send_email(email, f"Verify Your Email - {self.app_name}", html_content)
    
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
        
        return self.send_email(email, f"Reset Your Password - {self.app_name}", html_content)