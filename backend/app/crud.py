from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas, security

# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    if not email:
        return None
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_phone(db: Session, country_code: str, phone_number: str):
    if not phone_number:
        return None
    return db.query(models.User).filter(
        models.User.country_code == country_code,
        models.User.phone_number == phone_number
    ).first()

def get_user_by_email_or_phone(db: Session, identifier: str):
    if not identifier:
        return None
    # Check if the identifier is email or phone number
    # Normalize identifier - strip spaces
    val = identifier.strip()
    return db.query(models.User).filter(
        or_(
            models.User.email == val,
            models.User.phone_number == val
        )
    ).first()

def create_user(db: Session, user: schemas.UserCreate, is_admin: bool = False):
    from datetime import datetime
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        phone_number=user.phone_number,
        country_code=user.country_code or "+91",
        full_name=user.full_name,
        hashed_password=hashed_password,
        is_admin=is_admin,
        joined_date=datetime.utcnow().strftime("%Y-%m-%d"),
        last_active=datetime.utcnow().isoformat() + "Z",
        phone_verified=False,
        email_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Exam CRUD
def get_exam(db: Session, exam_id: int):
    return db.query(models.Exam).filter(models.Exam.id == exam_id).first()

def get_exam_by_name(db: Session, name: str):
    return db.query(models.Exam).filter(models.Exam.name == name).first()

def get_exams(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    category: str = None,
    level: str = None
):
    query = db.query(models.Exam)
    
    if search:
        query = query.filter(
            or_(
                models.Exam.name.ilike(f"%{search}%"),
                models.Exam.conducting_org.ilike(f"%{search}%"),
                models.Exam.description.ilike(f"%{search}%"),
                models.Exam.eligibility.ilike(f"%{search}%"),
                models.Exam.category.ilike(f"%{search}%")
            )
        )
    if category:
        query = query.filter(models.Exam.category.ilike(category))
    if level:
        query = query.filter(models.Exam.level.ilike(level))
        
    return query.offset(skip).limit(limit).all()

def create_exam(db: Session, exam: schemas.ExamCreate):
    db_exam = models.Exam(**exam.model_dump())
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def update_exam(db: Session, exam_id: int, exam_data: schemas.ExamCreate):
    db_exam = get_exam(db, exam_id)
    if not db_exam:
        return None
    for key, value in exam_data.model_dump().items():
        setattr(db_exam, key, value)
    db.commit()
    db.refresh(db_exam)
    return db_exam

def delete_exam(db: Session, exam_id: int):
    db_exam = get_exam(db, exam_id)
    if not db_exam:
        return False
    db.delete(db_exam)
    db.commit()
    return True

# Bookmark Operations
def toggle_bookmark(db: Session, user_id: int, exam_id: int):
    user = get_user(db, user_id)
    exam = get_exam(db, exam_id)
    if not user or not exam:
        return None
        
    if exam in user.saved_exams:
        user.saved_exams.remove(exam)
        status = "removed"
    else:
        user.saved_exams.append(exam)
        status = "added"
        
    db.commit()
    return status
