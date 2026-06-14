from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Table, Date, JSON
from sqlalchemy.orm import relationship
from .database import Base

# Association Table for Bookmarks
bookmarks_association = Table(
    "bookmarks",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("exam_id", Integer, ForeignKey("exams.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    phone_number = Column(String, unique=True, index=True, nullable=True)
    country_code = Column(String, nullable=True, default="+91")
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    joined_date = Column(String, nullable=True)
    last_active = Column(String, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(String, nullable=True)
    phone_verified = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    education = Column(String, nullable=True)
    stream = Column(String, nullable=True)
    career_goal = Column(String, nullable=True)
    state = Column(String, nullable=True)

    saved_exams = relationship("Exam", secondary=bookmarks_association, back_populates="saved_by_users")

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    conducting_org = Column(String, nullable=False)
    description = Column(String, nullable=True)
    level = Column(String, nullable=False) # e.g. 10th, 12th, UG, Graduate
    eligibility = Column(String, nullable=True)
    application_start_date = Column(String, nullable=True) # string or date (string is safer/easier for MVP formatting)
    last_date = Column(String, nullable=True)
    exam_date = Column(String, nullable=True)
    application_fee = Column(String, nullable=True)
    mode = Column(String, nullable=True) # Online, Offline, Hybrid
    category = Column(String, nullable=False) # e.g. Government, Engineering, Medical, Banking, College Entrance
    official_link = Column(String, nullable=True)
    syllabus_link = Column(String, nullable=True)
    papers_link = Column(String, nullable=True)
    notification_pdf = Column(String, nullable=True)

    # Production Upgrade Fields
    status = Column(String, nullable=True, default="Upcoming")
    state = Column(String, nullable=True, default="All India")
    difficulty_level = Column(String, nullable=True, default="Moderate")
    recommended_for = Column(JSON, nullable=True) # Stored as JSON array of strings
    career_outcome = Column(String, nullable=True)
    source_verified = Column(Boolean, nullable=True, default=False)
    data_source = Column(String, nullable=True)
    last_verified_date = Column(String, nullable=True)
    next_verification_due = Column(String, nullable=True)
    
    # Legacy Fields for full compatibility
    full_form = Column(String, nullable=True)
    exam_level = Column(String, nullable=True)
    age_limit = Column(String, nullable=True)
    frequency = Column(String, nullable=True)
    selection_process = Column(String, nullable=True)
    exam_pattern = Column(String, nullable=True)
    syllabus = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)

    # SEO & Analytics
    slug = Column(String, unique=True, index=True, nullable=True)
    view_count = Column(Integer, default=0)
    apply_click_count = Column(Integer, default=0)
    bookmark_count = Column(Integer, default=0)
    data_quality_score = Column(Integer, default=0)

    saved_by_users = relationship("User", secondary=bookmarks_association, back_populates="saved_exams")

class AISuggestion(Base):
    __tablename__ = "ai_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False) # new, update, expired
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="SET NULL"), nullable=True)
    
    # Payload details
    name = Column(String, nullable=False)
    conducting_org = Column(String, nullable=False)
    description = Column(String, nullable=True)
    level = Column(String, nullable=True)
    eligibility = Column(String, nullable=True)
    application_start_date = Column(String, nullable=True)
    last_date = Column(String, nullable=True)
    exam_date = Column(String, nullable=True)
    application_fee = Column(String, nullable=True)
    mode = Column(String, nullable=True)
    category = Column(String, nullable=True)
    official_link = Column(String, nullable=True)
    syllabus_link = Column(String, nullable=True)
    papers_link = Column(String, nullable=True)
    notification_pdf = Column(String, nullable=True)

    # Rollback Backup payload
    backup_data = Column(String, nullable=True) # JSON string representation

    # Source tracking
    source_url = Column(String, nullable=True)
    source_name = Column(String, nullable=True)
    detected_date = Column(String, nullable=True)

    # AI Quality metrics
    confidence_score = Column(Integer, default=100)
    confidence_reason = Column(String, nullable=True)

    status = Column(String, default="pending") # pending, approved, rejected, restored

class AIActivityLog(Base):
    __tablename__ = "ai_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    action = Column(String, nullable=False) # scan_started, exams_found, suggestion_approved, suggestion_rejected, rollback_executed, error
    details = Column(String, nullable=True)

class ExamView(Base):
    __tablename__ = "exam_views"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    viewed_time = Column(String, nullable=False)

class ExamClick(Base):
    __tablename__ = "exam_clicks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    clicked_time = Column(String, nullable=False)

class StudentSuggestion(Base):
    __tablename__ = "student_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_name = Column(String, nullable=False)
    organization = Column(String, nullable=False)
    official_link = Column(String, nullable=True)
    message = Column(String, nullable=True)
    request_count = Column(Integer, default=1)
    status = Column(String, default="pending") # pending, approved, rejected
    admin_reason = Column(String, nullable=True)
    source_verified = Column(Boolean, default=False)
    created_date = Column(String, nullable=False)

    # Relationship to user
    user = relationship("User")


class AdminActivityLog(Base):
    __tablename__ = "admin_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(String, nullable=False)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(String, nullable=True)


class ExamTranslation(Base):
    __tablename__ = "exam_translations"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    language_code = Column(String, nullable=False)
    description = Column(String, nullable=True)
    eligibility = Column(String, nullable=True)
    translation_status = Column(String, default="verified") # verified, needs_review


class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=True)
    type = Column(String, nullable=False) # bug, feature, general
    message = Column(String, nullable=False)
    submitted_date = Column(String, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)






