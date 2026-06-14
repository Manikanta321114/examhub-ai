from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from ..database import get_db
from .. import schemas, models
from .auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard_data(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved_exams = current_user.saved_exams
    
    # 1. Recommendations: based on saved exams' level or category + user preferences
    user_levels = set(exam.level for exam in saved_exams)
    user_categories = set(exam.category for exam in saved_exams)
    
    # Check preferences
    if current_user.education:
        edu = current_user.education.lower()
        if "10" in edu or "matric" in edu:
            user_levels.add("10th")
        if "12" in edu or "inter" in edu or "hsc" in edu:
            user_levels.add("12th")
        if "ug" in edu or "undergrad" in edu:
            user_levels.add("UG")
        if "grad" in edu or "degree" in edu or "postgrad" in edu or "pg" in edu:
            user_levels.add("Graduate")
            
    goal_stream_state = f"{current_user.career_goal or ''} {current_user.stream or ''} {current_user.education or ''}".lower()
    if "engineer" in goal_stream_state:
        user_categories.add("Engineering Exams")
    if "medic" in goal_stream_state or "doctor" in goal_stream_state:
        user_categories.add("Medical Exams")
    if "bank" in goal_stream_state:
        user_categories.add("Banking Exams")
    if "gov" in goal_stream_state or "civil" in goal_stream_state or "public" in goal_stream_state:
        user_categories.add("Government Exams")
    if "teach" in goal_stream_state or "tet" in goal_stream_state:
        user_categories.add("Teaching Exams")
    if "defence" in goal_stream_state or "army" in goal_stream_state or "nda" in goal_stream_state:
        user_categories.add("Defence Exams")
    if "college" in goal_stream_state or "university" in goal_stream_state:
        user_categories.add("College Entrance Exams")

    recommended_query = db.query(models.Exam).filter(models.Exam.id.notin_([e.id for e in saved_exams]))
    
    if user_levels or user_categories:
        from sqlalchemy import or_
        filters = []
        if user_levels:
            filters.append(models.Exam.level.in_(list(user_levels)))
        if user_categories:
            filters.append(models.Exam.category.in_(list(user_categories)))
        recommended_exams = recommended_query.filter(or_(*filters)).all()
    else:
        # Default: return popular ones if user has no bookmarks yet
        recommended_exams = recommended_query.all()

    # Prioritize based on user state if set
    if current_user.state and recommended_exams:
        state_lower = current_user.state.lower()
        def state_priority(exam):
            e_state = (exam.state or "").lower()
            if state_lower in e_state:
                return 0
            if "all india" in e_state or not e_state:
                return 1
            return 2
        recommended_exams = sorted(recommended_exams, key=state_priority)

    recommended_exams = recommended_exams[:6]

    # 2. Upcoming Deadlines: saved exams (interested exams) sorted by last date
    all_exams_for_deadlines = saved_exams
    
    # Simple sort helper that handles empty string/None last_date
    def get_sort_key(exam):
        return exam.last_date if exam.last_date else "9999-12-31"

    upcoming_deadlines = sorted(all_exams_for_deadlines, key=get_sort_key)[:5]

    # 3. User Notifications
    notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.id.desc()).limit(10).all()

    return {
        "saved_exams": saved_exams,
        "recommended_exams": recommended_exams,
        "upcoming_deadlines": upcoming_deadlines,
        "notifications": notifications
    }
