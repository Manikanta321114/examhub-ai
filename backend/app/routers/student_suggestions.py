import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import schemas, models
from .auth import get_current_user, get_current_admin, log_admin_activity

router = APIRouter(prefix="/suggestions", tags=["Student Exam Suggestions"])

def normalize_exam_name(name: str) -> str:
    name_lower = name.lower().strip()
    name_lower = re.sub(r"[-.,_]", " ", name_lower)
    return re.sub(r"\s+", " ", name_lower)

@router.post("/", response_model=schemas.StudentSuggestionResponse, status_code=status.HTTP_201_CREATED)
def submit_exam_suggestion(
    suggestion: schemas.StudentSuggestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    norm_name = normalize_exam_name(suggestion.exam_name)
    
    # Check if a pending suggestion with the same normalized name and conducting organization already exists
    pending_suggestions = db.query(models.StudentSuggestion).filter(
        models.StudentSuggestion.status == "pending"
    ).all()

    existing = None
    for p in pending_suggestions:
        if normalize_exam_name(p.exam_name) == norm_name and p.organization.lower().strip() == suggestion.organization.lower().strip():
            existing = p
            break
            
    if existing:
        # Increment request count and return
        existing.request_count += 1
        db.commit()
        db.refresh(existing)
        
        # Attach email for response compatibility
        existing.user_email = current_user.email
        return existing
        
    # Create new suggestion
    new_sug = models.StudentSuggestion(
        user_id=current_user.id,
        exam_name=suggestion.exam_name,
        organization=suggestion.organization,
        official_link=suggestion.official_link,
        message=suggestion.message,
        request_count=1,
        status="pending",
        source_verified=False,
        created_date=datetime.utcnow().strftime("%Y-%m-%d")
    )
    db.add(new_sug)
    db.commit()
    db.refresh(new_sug)
    
    new_sug.user_email = current_user.email
    return new_sug

@router.get("/my", response_model=List[schemas.StudentSuggestionResponse])
def get_my_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Retrieve suggestions submitted by the logged in student
    suggestions = db.query(models.StudentSuggestion).filter(
        models.StudentSuggestion.user_id == current_user.id
    ).order_by(models.StudentSuggestion.id.desc()).all()
    return suggestions

@router.get("/admin", response_model=List[schemas.StudentSuggestionResponse])
def list_suggestions_for_admin(
    sort_by: Optional[str] = Query("newest", description="Sort by newest or most_requested"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    query = db.query(models.StudentSuggestion)
    
    # Join with User to load emails
    suggestions = query.all()
    for s in suggestions:
        # Retrieve user email
        user_record = db.query(models.User).filter(models.User.id == s.user_id).first()
        s.user_email = user_record.email if user_record else "Anonymous"

    if sort_by == "most_requested":
        return sorted(suggestions, key=lambda x: x.request_count, reverse=True)
    else:
        # Default: newest (highest ID first)
        return sorted(suggestions, key=lambda x: x.id, reverse=True)

@router.post("/admin/{suggestion_id}/approve", response_model=schemas.StudentSuggestionResponse)
def approve_student_suggestion(
    suggestion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    sug = db.query(models.StudentSuggestion).filter(models.StudentSuggestion.id == suggestion_id).first()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")
        
    sug.status = "approved"
    sug.source_verified = True # Admin verifies the official link and source when converting
    db.commit()
    db.refresh(sug)
    
    # Simulate future notification ready dispatch
    user_record = db.query(models.User).filter(models.User.id == sug.user_id).first()
    email = user_record.email if user_record else "Unknown User"
    print(f"NOTIFICATION MOCK DISPATCH [FUTURE READY]: To: {email} -> 'Your requested exam \"{sug.exam_name}\" was added 🎉'")
    
    log_admin_activity(db, "Admin approved suggestion", request, f"Approved suggestion for exam: {sug.exam_name}")
    sug.user_email = email
    return sug

@router.post("/admin/{suggestion_id}/reject", response_model=schemas.StudentSuggestionResponse)
def reject_student_suggestion(
    suggestion_id: int,
    payload: schemas.StudentSuggestionReject,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    sug = db.query(models.StudentSuggestion).filter(models.StudentSuggestion.id == suggestion_id).first()
    if not sug:
        raise HTTPException(status_code=404, detail="Suggestion not found")
        
    sug.status = "rejected"
    sug.admin_reason = payload.reason
    db.commit()
    db.refresh(sug)
    
    user_record = db.query(models.User).filter(models.User.id == sug.user_id).first()
    email = user_record.email if user_record else "Unknown User"
    
    log_admin_activity(db, "Admin rejected suggestion", request, f"Rejected suggestion for: {sug.exam_name}. Reason: {payload.reason}")
    sug.user_email = email
    return sug
