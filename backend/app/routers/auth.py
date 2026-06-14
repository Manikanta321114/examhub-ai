import re
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import List

from ..database import get_db
from .. import schemas, models, crud, security

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login-form")

def validate_password_strength(password: str):
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long"
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one uppercase letter"
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number"
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one special character"
        )

def log_admin_activity(db: Session, action: str, request: Request, details: str = None):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    
    log = models.AdminActivityLog(
        timestamp=datetime.utcnow().isoformat() + "Z",
        action=action,
        ip_address=ip,
        user_agent=ua,
        details=details
    )
    db.add(log)
    db.commit()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        sub_val: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if sub_val is None or user_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=sub_val, user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    user = crud.get_user(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    
    # Update last active timestamp
    user.last_active = datetime.utcnow().isoformat() + "Z"
    db.commit()
    
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges"
        )
    return current_user

@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Require at least one of email or phone_number
    if not user.email and not user.phone_number:
        raise HTTPException(
            status_code=400,
            detail="You must provide either an email address or a mobile number."
        )
    
    is_first = db.query(models.User).count() == 0
    
    # 2. Admin account safety - admins must have email
    if is_first and not user.email:
        raise HTTPException(
            status_code=400,
            detail="Admin account signup requires an email address."
        )

    # 3. Email validation & uniqueness (if provided)
    if user.email:
        db_user = crud.get_user_by_email(db, email=user.email)
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    # 4. Phone number validation & uniqueness (if provided)
    if user.phone_number:
        # Standardize: remove spaces or other special characters
        clean_phone = re.sub(r"\D", "", user.phone_number)
        if len(clean_phone) != 10:
            raise HTTPException(
                status_code=400,
                detail="Mobile number must be exactly 10 digits (e.g. 9876543210)"
            )
        # Store standardized 10-digit number
        user.phone_number = clean_phone
        user.country_code = user.country_code or "+91"
        
        db_phone_user = crud.get_user_by_phone(db, country_code=user.country_code, phone_number=user.phone_number)
        if db_phone_user:
            raise HTTPException(status_code=400, detail="Mobile number already registered")

    # Validate password rules
    validate_password_strength(user.password)
    
    return crud.create_user(db=db, user=user, is_admin=is_first)

@router.post("/login", response_model=schemas.Token)
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    # Auto detect email (contains @) or phone (numbers only)
    identifier = user_credentials.email.strip()
    is_phone_format = False
    
    # Clean phone lookup if it is all digits after removing space/plus/country code
    clean_identifier = re.sub(r"[\s\+\-]", "", identifier)
    if clean_identifier.isdigit():
        is_phone_format = True
        # If it has a country code prefix (e.g., 919876543210), strip the country code if it matches +91 or 91
        if len(clean_identifier) > 10:
            if clean_identifier.startswith("91") and len(clean_identifier) == 12:
                identifier = clean_identifier[2:]
            else:
                identifier = clean_identifier
        else:
            identifier = clean_identifier

    user = crud.get_user_by_email_or_phone(db, identifier=identifier)
    
    if user:
        if user.locked_until:
            locked_time = datetime.fromisoformat(user.locked_until.replace("Z", ""))
            if locked_time > datetime.utcnow():
                minutes_left = int((locked_time - datetime.utcnow()).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account is temporarily locked. Try again in {minutes_left} minutes."
                )
            else:
                user.locked_until = None
                db.commit()
                
    if not user or not security.verify_password(user_credentials.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = (datetime.utcnow() + timedelta(minutes=15)).isoformat() + "Z"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed login attempts. Your account has been locked for 15 minutes."
                )
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email, mobile number, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    access_token = security.create_access_token(
        data={"sub": user.email or user.phone_number, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

from fastapi.security import OAuth2PasswordRequestForm
@router.post("/login-form", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    identifier = form_data.username.strip()
    clean_identifier = re.sub(r"[\s\+\-]", "", identifier)
    if clean_identifier.isdigit():
        if len(clean_identifier) > 10:
            if clean_identifier.startswith("91") and len(clean_identifier) == 12:
                identifier = clean_identifier[2:]
            else:
                identifier = clean_identifier
        else:
            identifier = clean_identifier

    user = crud.get_user_by_email_or_phone(db, identifier=identifier)
    
    if user:
        if user.locked_until:
            locked_time = datetime.fromisoformat(user.locked_until.replace("Z", ""))
            if locked_time > datetime.utcnow():
                minutes_left = int((locked_time - datetime.utcnow()).total_seconds() / 60) + 1
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Account is temporarily locked. Try again in {minutes_left} minutes."
                )
            else:
                user.locked_until = None
                db.commit()
                
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        if user:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = (datetime.utcnow() + timedelta(minutes=15)).isoformat() + "Z"
                db.commit()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed login attempts. Your account has been locked for 15 minutes."
                )
            db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email, mobile number, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()
    
    access_token = security.create_access_token(
        data={"sub": user.email or user.phone_number, "user_id": user.id}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/settings/email", response_model=schemas.UserResponse)
def update_email(
    payload: schemas.AdminEmailUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not security.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    if payload.email != current_user.email:
        existing = crud.get_user_by_email(db, email=payload.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        old_email = current_user.email
        current_user.email = payload.email
        db.commit()
        db.refresh(current_user)
        
        if current_user.is_admin:
            log_admin_activity(
                db, 
                "Admin changed email", 
                request, 
                f"Changed email from {old_email} to {payload.email}"
            )
            
    return current_user

@router.put("/settings/password")
def update_password(
    payload: schemas.AdminPasswordUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not security.verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    validate_password_strength(payload.new_password)
    
    current_user.hashed_password = security.get_password_hash(payload.new_password)
    db.commit()
    
    if current_user.is_admin:
        log_admin_activity(
            db, 
            "Admin changed password", 
            request, 
            "Updated administrative login password"
        )
        
    return {"message": "Password updated successfully"}

@router.get("/activity-logs", response_model=List[schemas.AdminActivityLogResponse])
def get_activity_logs(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    logs = db.query(models.AdminActivityLog).order_by(models.AdminActivityLog.id.desc()).all()
    return logs
