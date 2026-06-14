import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from jose import jwt, JWTError

from ..database import get_db
from .. import schemas, models, security
from .auth import get_current_admin, get_current_user

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics & Metrics"])

# Helper to optionally parse user ID from Bearer token without raising HTTP exceptions (for guest tracking)
def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[int]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        return payload.get("user_id")
    except JWTError:
        return None

# Endpoints for Tracking Events (View & Click)
@router.post("/exams/{exam_id}/view", status_code=status.HTTP_201_CREATED)
def record_exam_view(
    exam_id: int,
    db: Session = Depends(get_db),
    user_id: Optional[int] = Depends(get_optional_user_id)
):
    # Verify exam exists
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    view_entry = models.ExamView(
        user_id=user_id,
        exam_id=exam_id,
        viewed_time=datetime.utcnow().isoformat() + "Z"
    )
    db.add(view_entry)
    db.commit()
    return {"detail": "View recorded"}

@router.post("/exams/{exam_id}/click", status_code=status.HTTP_201_CREATED)
def record_exam_click(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify exam exists
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    click_entry = models.ExamClick(
        user_id=current_user.id,
        exam_id=exam_id,
        clicked_time=datetime.utcnow().isoformat() + "Z"
    )
    db.add(click_entry)
    db.commit()
    return {"detail": "Click recorded"}

# Restricted Admin Analytics Endpoints
@router.get("/overview", response_model=dict)
def get_platform_overview(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    current_month_str = datetime.utcnow().strftime("%Y-%m")

    # Counts
    total_users = db.query(models.User).count()
    total_exams = db.query(models.Exam).count()
    pending_ai_suggestions = db.query(models.AISuggestion).filter(models.AISuggestion.status == "pending").count()
    pending_student_suggestions = db.query(models.StudentSuggestion).filter(models.StudentSuggestion.status == "pending").count()
    total_clicks = db.query(models.ExamClick).count()

    # Daily Growth Metrics
    new_users_today = db.query(models.User).filter(models.User.joined_date == today_str).count()
    # Clicks today requires checking ISO string date match
    clicks_today = db.query(models.ExamClick).filter(models.ExamClick.clicked_time.like(f"{today_str}%")).count()

    # Monthly Metrics
    new_users_month = db.query(models.User).filter(models.User.joined_date.like(f"{current_month_str}%")).count()
    active_users = db.query(models.User).filter(models.User.last_active.isnot(None)).count()

    # Simple chart data for user growth (mock list matching dates for AnalyticsChart rendering)
    chart_data = [
        {"date": "Mon", "users": 10, "clicks": 25},
        {"date": "Tue", "users": 15, "clicks": 42},
        {"date": "Wed", "users": 28, "clicks": 50},
        {"date": "Thu", "users": 34, "clicks": 75},
        {"date": "Fri", "users": 42, "clicks": 110},
        {"date": "Sat", "users": 55, "clicks": 140},
        {"date": "Sun", "users": 65 + new_users_today, "clicks": 160 + clicks_today}
    ]

    return {
        "total_users": total_users,
        "total_exams": total_exams,
        "pending_suggestions": pending_ai_suggestions,
        "pending_student_suggestions": pending_student_suggestions,
        "total_clicks": total_clicks,
        "new_users_today": new_users_today,
        "clicks_today": clicks_today,
        "new_users_month": new_users_month,
        "active_users": active_users,
        "chart_data": chart_data
    }

@router.get("/users", response_model=List[dict])
def get_user_analytics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    users = db.query(models.User).all()
    user_list = []
    
    for u in users:
        # Calculate bookmark count
        bookmarks_count = len(u.saved_exams)
        
        user_list.append({
            "email": u.email or "N/A",
            "phone_number": f"{u.country_code} {u.phone_number}" if u.phone_number else "N/A",
            "full_name": u.full_name,
            "joined_date": u.joined_date or "TBD",
            "bookmarks_count": bookmarks_count,
            "last_active": u.last_active or "Inactive"
        })
        
    return user_list

@router.get("/exams", response_model=List[dict])
def get_exam_analytics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    exams = db.query(models.Exam).all()
    exam_stats = []
    
    for e in exams:
        views = db.query(models.ExamView).filter(models.ExamView.exam_id == e.id).count()
        clicks = db.query(models.ExamClick).filter(models.ExamClick.exam_id == e.id).count()
        
        conversion = 0.0
        if views > 0:
            conversion = round((clicks / views) * 100, 1)
            
        exam_stats.append({
            "id": e.id,
            "name": e.name,
            "conducting_org": e.conducting_org,
            "views": views,
            "clicks": clicks,
            "conversion_rate": conversion
        })
        
    # Sort by views descending
    return sorted(exam_stats, key=lambda x: x["views"], reverse=True)
