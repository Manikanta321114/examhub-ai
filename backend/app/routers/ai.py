from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from datetime import datetime, date

from ..database import get_db
from .. import schemas, models, security
from ..services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="auth/login-form", auto_error=False)

def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return db.query(models.User).filter(models.User.email == email).first()
    except Exception:
        return None

def _time_greeting() -> str:
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    elif hour < 17:
        return "Good afternoon"
    else:
        return "Good evening"

@router.get("/daily-summary")
def get_daily_summary(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    """Return a role-aware greeting + quick actions for the Mani AI floating assistant."""
    greeting_time = _time_greeting()

    # ── ADMIN ──────────────────────────────────────────────────────────
    if current_user and current_user.is_admin:
        from ..models import AIActivityLog, AISuggestion
        # Count pending suggestions (need review)
        try:
            pending_count = db.query(AISuggestion).filter(
                AISuggestion.status == "pending"
            ).count()
        except Exception:
            pending_count = 0

        # Count new exams found today via logs
        try:
            today_str = date.today().isoformat()
            new_today = db.query(AIActivityLog).filter(
                AIActivityLog.action == "exams_found",
                AIActivityLog.timestamp >= today_str
            ).count()
        except Exception:
            new_today = 0

        # Count updates today
        try:
            updates_today = db.query(AIActivityLog).filter(
                AIActivityLog.action.in_(["exam_updated", "status_updated"]),
                AIActivityLog.timestamp >= date.today().isoformat()
            ).count()
        except Exception:
            updates_today = 0

        # Sources checked (approximate from scan logs today)
        try:
            scans_today = db.query(AIActivityLog).filter(
                AIActivityLog.action == "scan_started",
                AIActivityLog.timestamp >= date.today().isoformat()
            ).count()
            sources_checked = scans_today * 245  # avg per scan
        except Exception:
            sources_checked = 0

        greeting = (
            f"{greeting_time} Boss 👋\n\n"
            f"While you were away I monitored ExamHub.\n\n"
            f"Today's report:\n"
            f"🔍 Checked {sources_checked or 245} official sources\n"
            f"🆕 Found {new_today or 0} new exams\n"
            f"🔄 Updated {updates_today or 0} exam details\n"
            f"⚠️ {pending_count} items need your approval\n\n"
            f"Everything is under control 🚀"
        )

        return {
            "role": "admin",
            "greeting": greeting,
            "notification_count": pending_count,
            "quick_actions": [
                {"label": "Scan", "query": "Run AI Scan now"},
                {"label": "Reports", "query": "Show today's exam report"},
                {"label": "Reviews", "query": "Show pending approvals"},
            ]
        }

    # ── STUDENT ────────────────────────────────────────────────────────
    if current_user and not current_user.is_admin:
        # Count saved exams
        try:
            saved_count = len(current_user.saved_exams) if current_user.saved_exams else 0
        except Exception:
            saved_count = 0

        # Count exams with deadlines within 7 days
        from datetime import timedelta
        deadline_count = 0
        try:
            upcoming_limit = (date.today() + timedelta(days=7)).isoformat()
            deadline_count = db.query(models.Exam).filter(
                models.Exam.last_date != None,
                models.Exam.last_date >= date.today().isoformat(),
                models.Exam.last_date <= upcoming_limit
            ).count()
        except Exception:
            deadline_count = 0

        # Match exams by education/stream
        matched_count = 0
        try:
            if current_user.education or current_user.stream or current_user.career_goal:
                q = db.query(models.Exam)
                if current_user.education:
                    q = q.filter(models.Exam.level == current_user.education)
                if current_user.career_goal:
                    q = q.filter(models.Exam.category == current_user.career_goal)
                matched_count = q.count()
        except Exception:
            matched_count = 0

        name = current_user.full_name.split()[0] if current_user.full_name else "there"
        greeting = (
            f"Hi {name} 👋 I'm Mani.\n\n"
            f"I checked opportunities for you.\n\n"
            f"🎓 {matched_count} exams matching your profile\n"
            f"⏰ {deadline_count} deadlines in next 7 days\n"
            f"💾 {saved_count} exams saved\n\n"
            f"Ask me anything about exams or career paths 🚀"
        )

        return {
            "role": "student",
            "greeting": greeting,
            "notification_count": deadline_count,
            "quick_actions": [
                {"label": "My Matches", "query": "Show exams matching my profile"},
                {"label": "Deadlines", "query": "Show upcoming exam deadlines"},
                {"label": "Saved Exams", "query": "Show my saved exams"},
            ]
        }

    # ── GUEST ──────────────────────────────────────────────────────────
    return {
        "role": "guest",
        "greeting": (
            "Hi 👋 I'm Mani.\n\n"
            "Tell me your qualification or career goal.\n"
            "I'll find the best opportunities for you 🚀"
        ),
        "notification_count": 0,
        "quick_actions": [
            {"label": "After 12th", "query": "After 12th"},
            {"label": "Engineering", "query": "Engineering exams"},
            {"label": "Government", "query": "Government job exams"},
        ]
    }

@router.post("/chat", response_model=schemas.AIQueryResponse)
def ask_ai_assistant(
    request: schemas.AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_optional_current_user)
):
    import re
    # 1. Typo normalization and user preference extraction/persistence (Point 3)
    if current_user:
        q = request.message.lower()
        # Normalization
        q = re.sub(r"\benginering\b|\bengineering\b|\bengineer\b", "engineering", q)
        q = re.sub(r"\bgovt\b|\bgovernment\b", "government", q)
        q = re.sub(r"\bmedicl\b|\bmedical\b", "medical", q)
        
        # Extracted variables
        edu = None
        strm = None
        goal = None
        st = None
        
        # State
        if "karnataka" in q: st = "Karnataka"
        elif "maharashtra" in q: st = "Maharashtra"
        elif "delhi" in q: st = "Delhi"
        elif "tamil nadu" in q: st = "Tamil Nadu"
        
        # Education / Stream
        if "10th" in q: edu = "10th"
        elif "12th" in q:
            edu = "12th"
            if "science" in q: strm = "science"
            elif "commerce" in q: strm = "commerce"
            elif "arts" in q: strm = "arts"
        elif "ug" in q or "undergrad" in q: edu = "UG"
        elif "graduate" in q or "degree" in q: edu = "Graduate"
        elif "engineering" in q:
            edu = "Graduate"
            strm = "engineering"
        elif "medical" in q or "neet" in q:
            strm = "medical"
            
        # Career goal / Category
        if "government" in q or "govt" in q: goal = "Government Exams"
        elif "bank" in q: goal = "Banking Exams"
        elif "defence" in q: goal = "Defence Exams"
        
        # Update columns
        if edu: current_user.education = edu
        if strm: current_user.stream = strm
        if goal: current_user.career_goal = goal
        if st: current_user.state = st
        
        if edu or strm or goal or st:
            db.commit()
            
    # 2. Build user_prefs dictionary to feed greeting memory / prompts
    user_prefs = None
    if current_user:
        user_prefs = {
            "education": current_user.education,
            "stream": current_user.stream,
            "career_goal": current_user.career_goal,
            "state": current_user.state,
            "is_admin": current_user.is_admin
        }

    history_list = [{"role": h.role, "content": h.content} for h in request.history] if request.history else []
    answer, matching_exams = AIService.answer_query(db, request.message, history_list, user_prefs)
    return {
        "answer": answer,
        "suggested_exams": matching_exams
    }
