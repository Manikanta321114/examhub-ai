import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Prevent empty string override issues
raw_url = os.getenv("DATABASE_URL")
if raw_url and raw_url.strip():
    DATABASE_URL = raw_url.strip()
else:
    DATABASE_URL = "sqlite:///./examhub.db"

# Support Render/Heroku standard database URL pattern
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Safe logging (Never print password/credentials)
if DATABASE_URL.startswith("sqlite"):
    print("DATABASE_URL detected: SQLite database engine")
elif "postgresql" in DATABASE_URL or "postgres" in DATABASE_URL:
    print("DATABASE_URL detected: PostgreSQL database engine")
else:
    print("DATABASE_URL detected: Unknown database engine")

is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

if is_sqlite:
    # Resolve absolute path relative to backend directory to prevent CWD mismatch
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if db_path.startswith("./") or not os.path.isabs(db_path):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        clean_path = db_path.replace("./", "", 1) if db_path.startswith("./") else db_path
        DATABASE_URL = f"sqlite:///{os.path.join(base_dir, clean_path)}"

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
