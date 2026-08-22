
from datetime import datetime, timedelta, timezone 
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import user
from models.StudentInfo import StudentInfo
import secrets
import hashlib
from typing import Optional
from fastapi.responses import JSONResponse
from services.email_service import EmailService
from pydantic import BaseModel, EmailStr  # ✅ ADD EmailStr HERE
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks  # ✅ ADD BackgroundTasks
import bcrypt
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request  # ✅ Add this import




router = APIRouter()

from core.config import settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")
limiter = Limiter(key_func=get_remote_address)
# ============================================
# REQUEST MODELS (define once)
# ============================================
class RegisterRequest(BaseModel):
    Email: EmailStr
    Password: str
    FirstName: Optional[str] = None
    MiddleName: Optional[str] = None
    LastName: Optional[str] = None
    PhoneMobile: Optional[str] = None
    GradeId: Optional[str] = None
    DateOfBirth: Optional[str] = None
    CaptchaToken: Optional[str] = None  # ✅ ADD THIS

class LoginRequest(BaseModel):
    Email: str
    Password: str

class UpdateProfileRequest(BaseModel):
    StudentId: Optional[str] = None
    FirstName: Optional[str] = None
    MiddleName: Optional[str] = None
    LastName: Optional[str] = None
    DateOfBirth: Optional[datetime] = None
    PhoneMobile: Optional[str] = None
    PhoneResidence: Optional[str] = None
    WebAddress: Optional[str] = None
    Address: Optional[str] = None
    Grade: Optional[str] = None
    Gender: Optional[str] = None

class LoginResponse(BaseModel):
    message: str
    token: str
    userId: str
    email: str
    role: str
    isVerified: bool
    studentId: Optional[str] = None
    firstName: Optional[str] = None
    isProfileComplete: bool = False
    subscriptionStatus: str = "Free"

    

# ============================================
# HELPER FUNCTIONS (define once)
# ============================================
def utc_now():
    """Return UTC datetime"""
    return datetime.utcnow()

# def create_password_hash(password: str):
#     """Create PBKDF2 password hash with separate salt"""
#     salt = secrets.token_hex(16)
#     hash_value = hashlib.pbkdf2_hmac(
#         'sha256',
#         password.encode('utf-8'),
#         salt.encode('utf-8'),
#         100000
#     ).hex()
#     return hash_value, salt

def verify_password(plain_password: str, stored_hash: str, stored_salt: str = None) -> bool:
    """Verify password against bcrypt hash"""
    try:
        print(f"🔍 Verifying password...")
        print(f"📝 Hash type: {'bcrypt' if stored_hash.startswith('$2') else 'unknown'}")
        print(f"📝 Hash preview: {stored_hash[:30]}...")
        
        result = bcrypt.checkpw(
            plain_password.encode('utf-8'),
            stored_hash.encode('utf-8')
        )
        print(f"✅ Verification result: {result}")
        return result
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_data = db.query(user).filter(user.UserID == user_id).first()
    if user_data is None:
        raise credentials_exception
    return user_data

# ============================================
# ENDPOINTS
# ============================================

@router.post("/register")
@limiter.limit("5/hour")
async def register(
    request: Request,
    register_data: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        print("=" * 60)
        print(f"📝 REGISTRATION ATTEMPT: {register_data.Email}")
        print("=" * 60)

        if len(register_data.Password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if len(register_data.Password) > 72:
            raise HTTPException(status_code=400, detail="Password must not exceed 72 characters")

        # 1. Check if email already exists
        if db.query(user).filter(user.Email == register_data.Email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # 2. Hash password
        hashed_password = bcrypt.hashpw(
            register_data.Password.encode('utf-8'),
            bcrypt.gensalt(12)
        ).decode('utf-8')

        verification_token = secrets.token_urlsafe(32)

        # === SINGLE TRANSACTION ===
        new_user = user(
            Email=register_data.Email,
            PasswordHash=hashed_password,
            PasswordSalt="",
            Role="Student",
            is_verified=False,
            is_active=True,
            verification_token=verification_token,
            CreatedOn=datetime.now(timezone.utc),
            UpdatedOn=datetime.now(timezone.utc)
        )
        db.add(new_user)
        db.flush()

        # Create StudentInfo with correct field names
        from models.StudentInfo import StudentInfo

        student = StudentInfo(
            UserID=new_user.UserID,
#            StudentID=f"STU{new_user.UserID}" if new_user.UserID else "STUTEMP",
            StuFirstName=register_data.FirstName or "",
            StuMiddleName=register_data.MiddleName or "",
            StuLastName=register_data.LastName or "",
            StuPhoneMobile=register_data.PhoneMobile or "",
            StuGrade=register_data.GradeId,
            StuDateOfBirth=register_data.DateOfBirth,
            StuGender=getattr(register_data, 'Gender', None),
            IsProfileComplete=False,
            SubscriptionStatus="Free",
            CreatedAt=datetime.now(timezone.utc),
            UpdatedAt=datetime.now(timezone.utc)
        )
        db.add(student)

        # Commit both records together
        db.commit()
        db.refresh(new_user)
        db.refresh(student)

        print(f"✅ User + StudentInfo created successfully!")
        print(f"   UserID: {new_user.UserID} | StudentID: {student.StudentID}")

        # 4. Send verification email ONLY after successful commit
        try:
            token_to_send = str(verification_token) 

            email_service = EmailService()
            background_tasks.add_task(
                email_service.send_verification_email,
                register_data.Email,
                verification_token
            )
            print(f"📧 Verification email queued for: {register_data.Email}")
        except Exception as e:
            print(f"⚠️ Failed to queue verification email: {str(e)}")
            # Do NOT rollback here - registration already succeeded

        print("=" * 60)
        print("✅ FULL REGISTRATION COMPLETED")
        print("=" * 60)

        return {
            "message": "Registration successful! Please check your email to verify your account.",
            "userId": new_user.UserID,
            "studentId": student.StudentID,
            "email": new_user.Email,
            "role": new_user.Role,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Registration failed and FULLY rolled back: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")



@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        print(f"Login attempt for email: {request.Email}")
        
        existing_user = db.query(user).filter(user.Email == request.Email).first()
        
        if not existing_user:
            import bcrypt as _bc
            _bc.checkpw(b"dummy_password_hash_for_timing", _bc.gensalt(12))
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid email or password"}
            )
        
        print(f"✅ User found: {existing_user.Email}")
        print(f"Hash: {existing_user.PasswordHash[:30]}...")
        
        # ✅ Use bcrypt directly
        import bcrypt
        is_valid = bcrypt.checkpw(
            request.Password.encode('utf-8'),
            existing_user.PasswordHash.encode('utf-8')
        )
        print(f"🔑 Password verification: {is_valid}")
        
        if not is_valid:
            print("❌ Password verification failed")
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid email or password"}
            )
        
        print("✅ Password verified!")
        
        if not existing_user.is_verified:
            return JSONResponse(
                status_code=403,
                content={"error": "Please verify your email before logging in"}
            )
        
        existing_user.LastLogin = utc_now()
        db.commit()
        
        access_token = create_access_token(data={"sub": existing_user.UserID})
        
        student_info = db.query(StudentInfo).filter(StudentInfo.UserID == existing_user.UserID).first()
        
        return {
            "message": "Login successful",
            "token": access_token,
            "userId": existing_user.UserID,
            "email": existing_user.Email,
            "role": existing_user.Role,
            "isVerified": existing_user.is_verified,
            "studentId": student_info.StudentID if student_info else None,
            "firstName": student_info.StuFirstName if student_info else None,
            "isProfileComplete": student_info.IsProfileComplete if student_info else False,
            "subscriptionStatus": student_info.SubscriptionStatus if student_info else "Free"
        }
        
    except Exception as e:
        print(f"Error during login: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

@router.get("/profile")
async def get_profile(current_user: user = Depends(get_current_user), db: Session = Depends(get_db)):
    student_info = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    
    student_data = None
    if student_info:
        student_data = {
            "StudentID": student_info.StudentID,
            "StuFirstName": student_info.StuFirstName,
            "StuMiddleName": student_info.StuMiddleName,
            "StuLastName": student_info.StuLastName,
            "StuDateOfBirth": student_info.StuDateOfBirth,
            "StuPhoneMobile": student_info.StuPhoneMobile,
            "StuPhoneResidence": student_info.StuPhoneResidence,
            "StuWebAddress": student_info.StuWebAddress,
            "StuAddress": student_info.StuAddress,
            "StuGrade": student_info.StuGrade,
            "StuGender": student_info.StuGender,
            "StuStatus": student_info.StuStatus,
			"SubscriptionStatus": student_info.SubscriptionStatus
        }
    
    return {
        "email": current_user.Email,
        "role": current_user.Role,
        "student": student_data
    }

@router.put("/profile")
async def update_profile(request: UpdateProfileRequest, current_user: user = Depends(get_current_user), db: Session = Depends(get_db)):
    student_info = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    
    if not student_info:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    if request.FirstName:
        student_info.StuFirstName = request.FirstName
    if request.MiddleName:
        student_info.StuMiddleName = request.MiddleName
    if request.LastName:
        student_info.StuLastName = request.LastName
    if request.DateOfBirth:
        student_info.StuDateOfBirth = request.DateOfBirth
    if request.PhoneMobile:
        student_info.StuPhoneMobile = request.PhoneMobile
    if request.PhoneResidence:
        student_info.StuPhoneResidence = request.PhoneResidence
    if request.WebAddress:
        student_info.StuWebAddress = request.WebAddress
    if request.Address:
        student_info.StuAddress = request.Address
    if request.Grade:
        student_info.StuGrade = request.Grade
    if request.Gender:
        student_info.StuGender = request.Gender
    
    student_info.UpdatedAt = datetime.utcnow()
    
    db.commit()
    db.refresh(student_info)
    
    return {
        "message": "Profile updated successfully",
        "student": {
            "StudentID": student_info.StudentID,
            "StuFirstName": student_info.StuFirstName,
            "StuMiddleName": student_info.StuMiddleName,
            "StuLastName": student_info.StuLastName,
            "StuDateOfBirth": student_info.StuDateOfBirth,
            "StuPhoneMobile": student_info.StuPhoneMobile,
            "StuPhoneResidence": student_info.StuPhoneResidence,
            "StuWebAddress": student_info.StuWebAddress,
            "StuAddress": student_info.StuAddress,
            "StuGrade": student_info.StuGrade,
            "StuGender": student_info.StuGender,
			"SubscriptionStatus": student_info.SubscriptionStatus
        }
    }

    
#=============================================================
# LOGIN EMAIL VERIFICATION AND PASSWORD RESET EXTENTION 
#==============================================================

class ForgotPasswordRequest(BaseModel):
    Email: EmailStr

class ResetPasswordRequest(BaseModel):
    Token: str
    NewPassword: str
    

    # routes/auth.py - ADD THESE ENDPOINTS


# ---------- EMAIL VERIFICATION ----------
@router.get("/verify-email")
async def verify_email(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify user's email address"""
    
    print(f"🔍 Verifying token: {token}")  # ✅ Debug
    
    existing_user = db.query(user).filter(
        user.verification_token == token
    ).first()
    
    print(f"📝 User found: {existing_user}")  # ✅ Debug
    
    if not existing_user:
        print("❌ No user found with this token")  # ✅ Debug
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    print(f"✅ User found: {existing_user.Email}")  # ✅ Debug
    print(f"📅 CreatedOn: {existing_user.CreatedOn}")  # ✅ Debug
    
    if existing_user.is_verified:
        print("ℹ️ Email already verified for this token")
        return {"message": "Email already verified. You can now login."}
    
    # Check if token has expired (24 hours)
    if existing_user.CreatedOn and (datetime.now(timezone.utc) - existing_user.CreatedOn) > timedelta(hours=24):
        print("❌ Token expired")  # ✅ Debug
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Mark user as verified
    existing_user.is_verified = True
    existing_user.UpdatedOn = datetime.now(timezone.utc)
    
    db.commit()
    
    print("✅ Email verified successfully!")  # ✅ Debug
    
    return {"message": "Email verified successfully! You can now login."}

# ---------- FORGOT PASSWORD ----------
@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    print(f"🔐 Forgot password request for: {request.Email}")
    
    # ✅ Use 'existing_user' as variable name, 'user' as model name
    existing_user = db.query(user).filter(user.Email == request.Email).first()
    
    if not existing_user:
        print("❌ User not found")
        return {"message": "If this email exists, a reset link has been sent"}
    
    print(f"✅ User found: {existing_user.Email}")
    
    reset_token = secrets.token_urlsafe(32)
    reset_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
    
    existing_user.reset_token = reset_token
    existing_user.reset_token_expiry = reset_expiry
    
    db.commit()
    
    print(f"📧 Sending reset email to: {request.Email}")
    
    email_service = EmailService()
    background_tasks.add_task(
        email_service.send_password_reset_email,
        request.Email,
        reset_token
    )
    
    return {"message": "If this email exists, a reset link has been sent"}

# ---------- RESET PASSWORD ----------
import bcrypt

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    
    existing_user = db.query(user).filter(
        user.reset_token == request.Token,
        user.reset_token_expiry > datetime.now(timezone.utc)
    ).first()
    
    if not existing_user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    if len(request.NewPassword) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Hash the new password
    hashed_password = bcrypt.hashpw(
        request.NewPassword.encode('utf-8'),
        bcrypt.gensalt(12)
    ).decode('utf-8')
    
    # Update user
    existing_user.PasswordHash = hashed_password
    existing_user.PasswordSalt = ""
    existing_user.reset_token = None
    existing_user.reset_token_expiry = None
    existing_user.UpdatedOn = datetime.now(timezone.utc)
    
    # ✅ CRITICAL FIX: Set is_verified to True
    # The user proved they own the email by using the reset link
    existing_user.is_verified = True
    
    db.commit()
    
    print(f"✅ Password reset for: {existing_user.Email} (is_verified: {existing_user.is_verified})")
    
    return {"message": "Password reset successfully! You can now login with your new password."}

def generate_salt() -> str:
    """Placeholder for compatibility - bcrypt doesn't need a separate salt"""
    return ""

def hash_password(password: str, salt: str = None) -> str:
    """Hash password using bcrypt"""
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt(12)
    ).decode('utf-8')

class ChangePasswordRequest(BaseModel):
    CurrentPassword: str
    NewPassword: str


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change user's password using bcrypt
    """
    try:
        print("=" * 50)
        print("🔐 CHANGE PASSWORD REQUEST")
        print(f"📝 User ID: {current_user.UserID}")
        print(f"📝 User Email: {current_user.Email}")
        print(f"📝 Hash preview: {current_user.PasswordHash[:30]}...")
        
        # Verify current password
        print("🔍 Verifying current password...")
        is_valid = verify_password(request.CurrentPassword, current_user.PasswordHash)
        print(f"✅ Password valid: {is_valid}")
        
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Current password is incorrect"
            )
        
        if len(request.NewPassword) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters")
        if len(request.NewPassword) > 72:
            raise HTTPException(status_code=400, detail="New password must not exceed 72 characters")
        if request.NewPassword == request.CurrentPassword:
            raise HTTPException(status_code=400, detail="New password must differ from current password")
        
        # Hash new password
        print("🔐 Hashing new password...")
        new_hash = hash_password(request.NewPassword)
        print(f"✅ New hash created: {new_hash[:30]}...")
        
        # Update password
        print("💾 Updating database...")
        current_user.PasswordHash = new_hash
        current_user.PasswordSalt = ""
        
        db.commit()
        print("✅ Database updated successfully!")
        print("=" * 50)
        
        return {
            "message": "Password changed successfully",
            "success": True
        }
        
    except HTTPException as e:
        print(f"❌ HTTP Exception: {e.detail}")
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to change password: {str(e)}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")