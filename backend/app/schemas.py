from pydantic import BaseModel, EmailStr
from typing import Optional, List

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# User Schemas
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    country_code: Optional[str] = "+91"
    full_name: Optional[str] = None
    education: Optional[str] = None
    stream: Optional[str] = None
    career_goal: Optional[str] = None
    state: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_admin: bool
    phone_verified: bool
    email_verified: bool

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str # Username input (can be email or mobile number)
    password: str

# Exam Schemas
class ExamBase(BaseModel):
    name: str
    conducting_org: str
    description: Optional[str] = None
    level: str # 10th, 12th, UG, Graduate
    eligibility: Optional[str] = None
    application_start_date: Optional[str] = None
    last_date: Optional[str] = None
    exam_date: Optional[str] = None
    application_fee: Optional[str] = None
    mode: Optional[str] = None
    category: str # Government, Engineering, Medical, Banking, College Entrance
    official_link: Optional[str] = None
    syllabus_link: Optional[str] = None
    papers_link: Optional[str] = None
    notification_pdf: Optional[str] = None

    # Production Upgrade Fields
    status: Optional[str] = "Upcoming"
    state: Optional[str] = "All India"
    difficulty_level: Optional[str] = "Moderate"
    recommended_for: Optional[List[str]] = []
    career_outcome: Optional[str] = None
    source_verified: Optional[bool] = False
    data_source: Optional[str] = None
    last_verified_date: Optional[str] = None
    next_verification_due: Optional[str] = None
    # Legacy compatibility fields
    full_form: Optional[str] = None
    exam_level: Optional[str] = None
    age_limit: Optional[str] = None
    frequency: Optional[str] = None
    selection_process: Optional[str] = None
    exam_pattern: Optional[str] = None
    syllabus: Optional[str] = None
    tags: Optional[List[str]] = []
    keywords: Optional[List[str]] = []
    # SEO & Analytics
    slug: Optional[str] = None
    view_count: Optional[int] = 0
    apply_click_count: Optional[int] = 0
    bookmark_count: Optional[int] = 0
    data_quality_score: Optional[int] = 0

class ExamCreate(ExamBase):
    pass

class ExamResponse(ExamBase):
    id: int

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    message: str
    created_at: str
    is_read: bool

    class Config:
        from_attributes = True

# Bookmark / Dashboard Schemas
class DashboardResponse(BaseModel):
    saved_exams: List[ExamResponse]
    recommended_exams: List[ExamResponse]
    upcoming_deadlines: List[ExamResponse]
    notifications: Optional[List[NotificationResponse]] = []

# AI Assistant Schemas
class Message(BaseModel):
    role: str # user or assistant
    content: str

class AIQueryRequest(BaseModel):
    message: str
    history: Optional[List[Message]] = []
    language: Optional[str] = "en"

class AIQueryResponse(BaseModel):
    answer: str
    suggested_exams: List[ExamResponse]


# AI Automation Schemas
class AISuggestionResponse(BaseModel):
    id: int
    type: str
    exam_id: Optional[int] = None
    name: str
    conducting_org: str
    description: Optional[str] = None
    level: Optional[str] = None
    eligibility: Optional[str] = None
    application_start_date: Optional[str] = None
    last_date: Optional[str] = None
    exam_date: Optional[str] = None
    application_fee: Optional[str] = None
    mode: Optional[str] = None
    category: Optional[str] = None
    official_link: Optional[str] = None
    syllabus_link: Optional[str] = None
    papers_link: Optional[str] = None
    notification_pdf: Optional[str] = None
    backup_data: Optional[str] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    detected_date: Optional[str] = None
    confidence_score: int
    confidence_reason: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

class AIActivityLogResponse(BaseModel):
    id: int
    timestamp: str
    action: str
    details: Optional[str] = None

    class Config:
        from_attributes = True

class StudentSuggestionCreate(BaseModel):
    exam_name: str
    organization: str
    official_link: Optional[str] = None
    message: Optional[str] = None

class StudentSuggestionResponse(StudentSuggestionCreate):
    id: int
    user_id: int
    request_count: int
    status: str
    admin_reason: Optional[str] = None
    source_verified: bool
    created_date: str
    user_email: Optional[str] = None # Added for admin view display

    class Config:
        from_attributes = True

class StudentSuggestionReject(BaseModel):
    reason: str


class AdminEmailUpdate(BaseModel):
    email: EmailStr
    current_password: str


class AdminPasswordUpdate(BaseModel):
    new_password: str
    current_password: str


class AdminActivityLogResponse(BaseModel):
    id: int
    timestamp: str
    action: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[str] = None

    class Config:
        from_attributes = True


class ExamTranslationBase(BaseModel):
    exam_id: int
    language_code: str
    description: Optional[str] = None
    eligibility: Optional[str] = None
    translation_status: Optional[str] = "verified" # verified, needs_review


class ExamTranslationCreate(ExamTranslationBase):
    pass


class ExamTranslationResponse(ExamTranslationBase):
    id: int

    class Config:
        from_attributes = True


class FeedbackCreate(BaseModel):
    type: str # bug, feature, general
    message: str
    email: Optional[str] = None


class FeedbackResponse(FeedbackCreate):
    id: int
    user_id: Optional[int] = None
    submitted_date: str

    class Config:
        from_attributes = True


class ImportConfirmPayload(BaseModel):
    exams: List[dict]
    duplicate_strategy: str  # "skip", "update", "create_new_version"


class SystemSettingBase(BaseModel):
    key: str
    value: str

class SystemSettingResponse(SystemSettingBase):
    class Config:
        from_attributes = True

class SystemSettingsUpdate(BaseModel):
    daily_auto_scan: bool
    auto_discover_new_exams: Optional[bool] = True
    auto_update_dates: Optional[bool] = True
    verify_official_links: Optional[bool] = True
    update_status_lifecycle: Optional[bool] = True
    notify_students: Optional[bool] = True
    track_results_admit_cards: Optional[bool] = True





