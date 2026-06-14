from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from jose import JWTError, jwt

from ..database import get_db
from .. import schemas, models, security
from .auth import get_current_admin

router = APIRouter(prefix="/feedback", tags=["Feedback"])

def get_optional_current_user(request: Request, db: Session = Depends(get_db)) -> Optional[models.User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is not None:
            return db.query(models.User).filter(models.User.id == user_id).first()
    except JWTError:
        pass
    return None

@router.post("/", response_model=schemas.FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    user_id = current_user.id if current_user else None
    email = current_user.email if current_user else feedback.email

    new_fb = models.Feedback(
        user_id=user_id,
        email=email,
        type=feedback.type,
        message=feedback.message,
        submitted_date=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_fb)
    db.commit()
    db.refresh(new_fb)
    return new_fb

@router.get("/admin", response_model=List[schemas.FeedbackResponse])
def list_feedback_for_admin(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    return db.query(models.Feedback).order_by(models.Feedback.id.desc()).all()
