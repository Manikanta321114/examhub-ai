from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

from .database import engine, Base, SessionLocal
from .models import Exam, User
from .data import SEED_EXAMS
from .security import get_password_hash
from .routers import auth, exams, dashboard, ai, ai_automation, admin_analytics, student_suggestions, feedback

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Check if we need to migrate users table to support optional emails and phone numbers
    from sqlalchemy import inspect, text
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        if "users" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "phone_number" not in columns:
                print("Upgrading database schema: migrating Users table to support email/phone login...")
                # 1. Backup old table
                db.execute(text("CREATE TABLE users_backup AS SELECT * FROM users"))
                
                # 2. Rename old table
                db.execute(text("ALTER TABLE users RENAME TO users_old"))
                db.execute(text("DROP INDEX IF EXISTS ix_users_email"))
                db.execute(text("DROP INDEX IF EXISTS ix_users_id"))
                
                # 3. Create new tables via SQLAlchemy Base metadata
                Base.metadata.create_all(bind=engine)
                
                # 4. Copy existing users data (with default email_verified=True for existing users, and phone_verified=False)
                db.execute(text("""
                    INSERT INTO users (id, email, phone_number, country_code, full_name, hashed_password, is_admin, joined_date, last_active, failed_login_attempts, locked_until, phone_verified, email_verified)
                    SELECT id, email, NULL, '+91', full_name, hashed_password, is_admin, joined_date, last_active, failed_login_attempts, locked_until, 0, 1
                    FROM users_old
                """))
                
                # 5. Drop old table
                db.execute(text("DROP TABLE users_old"))
                db.commit()
                print("Database schema successfully upgraded with phone number authentication support!")

            # Re-fetch columns to support newly migrated/created tables
            columns = [c["name"] for c in inspector.get_columns("users")]
            if "education" not in columns:
                print("Upgrading database schema: adding user preferences columns...")
                db.execute(text("ALTER TABLE users ADD COLUMN education TEXT"))
                db.execute(text("ALTER TABLE users ADD COLUMN stream TEXT"))
                db.execute(text("ALTER TABLE users ADD COLUMN career_goal TEXT"))
                db.execute(text("ALTER TABLE users ADD COLUMN state TEXT"))
                db.commit()
                print("Users table successfully upgraded with preferences support!")

        # 2. Check and migrate exams table
        if "exams" in inspector.get_table_names():
            columns = [c["name"] for c in inspector.get_columns("exams")]
            if "status" not in columns:
                print("Upgrading database schema: migrating Exams table to support new production fields...")
                db.execute(text("ALTER TABLE exams ADD COLUMN status TEXT DEFAULT 'Upcoming'"))
                db.execute(text("ALTER TABLE exams ADD COLUMN state TEXT DEFAULT 'All India'"))
                db.execute(text("ALTER TABLE exams ADD COLUMN difficulty_level TEXT DEFAULT 'Moderate'"))
                db.execute(text("ALTER TABLE exams ADD COLUMN recommended_for TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN career_outcome TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN source_verified INTEGER DEFAULT 0"))
                db.execute(text("ALTER TABLE exams ADD COLUMN data_source TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN last_verified_date TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN next_verification_due TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN slug TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN view_count INTEGER DEFAULT 0"))
                db.execute(text("ALTER TABLE exams ADD COLUMN apply_click_count INTEGER DEFAULT 0"))
                db.execute(text("ALTER TABLE exams ADD COLUMN bookmark_count INTEGER DEFAULT 0"))
                db.execute(text("ALTER TABLE exams ADD COLUMN data_quality_score INTEGER DEFAULT 0"))
                db.execute(text("ALTER TABLE exams ADD COLUMN full_form TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN exam_level TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN age_limit TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN frequency TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN selection_process TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN exam_pattern TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN syllabus TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN tags TEXT"))
                db.execute(text("ALTER TABLE exams ADD COLUMN keywords TEXT"))
                db.commit()

                # Generate unique slugs and calculate quality scores for existing exams
                import re
                def slugify(text_val):
                    text_val = text_val.lower().strip()
                    text_val = re.sub(r"[^\w\s-]", "", text_val)
                    text_val = re.sub(r"[\s_-]+", "-", text_val)
                    return text_val

                existing_exams = db.query(Exam).all()
                for exam in existing_exams:
                    base_slug = slugify(exam.name)
                    slug_candidate = base_slug
                    counter = 1
                    while db.query(Exam).filter(Exam.slug == slug_candidate, Exam.id != exam.id).first():
                        slug_candidate = f"{base_slug}-{counter}"
                        counter += 1
                    exam.slug = slug_candidate

                    # Calculate Quality Score
                    q_score = 0
                    if exam.official_link: q_score += 20
                    if exam.eligibility: q_score += 20
                    if exam.application_start_date or exam.last_date: q_score += 20
                    if exam.syllabus_link: q_score += 20
                    if exam.source_verified: q_score += 20
                    exam.data_quality_score = q_score

                db.commit()
                print("Exams table successfully upgraded!")

        # Ensure all tables (including newly added ones like notifications) are created
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}. Attempting standard table creation.")
        Base.metadata.create_all(bind=engine)
    finally:
        db.close()
    
    # Seed Data if empty
    db = SessionLocal()
    try:
        # Seed Exams
        if db.query(Exam).count() == 0:
            for exam_data in SEED_EXAMS:
                db_exam = Exam(**exam_data)
                db.add(db_exam)
            db.commit()
            print("Database seeded with sample exams successfully.")
        
        # Seed Default Admin if no admin exists, using environment variables for safety
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        if admin_email and admin_password:
            if db.query(User).filter(User.is_admin == True).count() == 0:
                admin_user = User(
                    email=admin_email,
                    full_name="ExamHub Admin",
                    hashed_password=get_password_hash(admin_password),
                    is_admin=True
                )
                db.add(admin_user)
                db.commit()
                print(f"Database seeded with Admin account: {admin_email}")
        else:
            env = os.getenv("ENVIRONMENT", "development")
            if env.lower() != "production":
                if db.query(User).filter(User.is_admin == True).count() == 0:
                    admin_user = User(
                        email="admin@examhub.com",
                        full_name="ExamHub Admin",
                        hashed_password=get_password_hash("admin123"),
                        is_admin=True
                    )
                    db.add(admin_user)
                    db.commit()
                    print("Local Default admin created: admin@examhub.com / admin123 (Please change password)")
            else:
                print("Production environment detected. Missing ADMIN_EMAIL/ADMIN_PASSWORD environment variables. Seeding skipped.")
        
        # Seed default settings if missing
        from .models import SystemSetting
        if db.query(SystemSetting).filter(SystemSetting.key == "daily_auto_scan").count() == 0:
            db.add(SystemSetting(key="daily_auto_scan", value="false"))
            db.commit()
            print("Default system settings seeded successfully.")
            
        # Run expired exam check once on startup
        from .ai_automation.scanner import AIScanner
        expired_res = AIScanner.check_and_update_expired_exams(db)
        print(f"Startup check: archived {expired_res.get('closed', 0)} closed and {expired_res.get('completed', 0)} completed exams.")
    finally:
        db.close()
        
    import asyncio
    async def daily_scan_scheduler_loop(db_session_factory):
        # Wait 2 minutes after launch before running first scheduler check
        await asyncio.sleep(120)
        while True:
            db_session = db_session_factory()
            try:
                from .models import SystemSetting
                from .ai_automation.scanner import AIScanner
                setting = db_session.query(SystemSetting).filter(SystemSetting.key == "daily_auto_scan").first()
                if setting and setting.value.lower() == "true":
                    print("[Scheduler] Running daily auto scan...")
                    AIScanner.execute_scan(db_session)
                    AIScanner.check_and_update_expired_exams(db_session)
                    print("[Scheduler] Daily auto scan completed.")
            except Exception as e:
                print(f"[Scheduler] Daily auto scan execution failed: {e}")
            finally:
                db_session.close()
            await asyncio.sleep(24 * 3600)

    # Spawn daily scheduler task in background
    asyncio.create_task(daily_scan_scheduler_loop(SessionLocal))
        
    yield

app = FastAPI(
    title="ExamHub AI API",
    description="Backend services for ExamHub AI - Centralized Student Exam Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Policy
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in allowed_origins_str.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://examhub.vercel.app"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(ai_automation.router)
app.include_router(admin_analytics.router)
app.include_router(student_suggestions.router)
app.include_router(feedback.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def home():
    return {"message": "Welcome to ExamHub AI API. Head to /docs for Swagger documentation."}
