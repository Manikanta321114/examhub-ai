import sys
import os
from datetime import datetime, timedelta

# Add parent directory of backend/app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app import models
from app.ai_automation.scanner import AIScanner
from app.routers.ai_automation import trigger_scan, get_ai_settings, update_ai_settings, get_ai_analytics
from app.schemas import SystemSettingsUpdate

def test_confidence_score_formula():
    print("Testing AI Confidence score formula...")
    
    # 1. Level 1 Official source, complete fields, PDF, valid dates -> 100/100
    sug1 = {
        "name": "UPSC IAS Exam 2027",
        "conducting_org": "UPSC",
        "level": "Graduate",
        "category": "Government Exams",
        "official_link": "https://upsc.gov.in/exams/ias-2027",
        "notification_pdf": "https://upsc.gov.in/notif.pdf",
        "application_start_date": "2027-01-01",
        "last_date": "2027-01-30",
        "exam_date": "2027-05-15"
    }
    score1, reason1, official1 = AIScanner.calculate_confidence(sug1)
    assert score1 == 100, f"Expected 100, got {score1}. Reason: {reason1}"
    assert official1 is True
    
    # 2. Unofficial source, complete fields, no PDF, invalid dates -> lower score
    sug2 = {
        "name": "UPSC IAS Exam 2027",
        "conducting_org": "UPSC",
        "level": "Graduate",
        "category": "Government Exams",
        "official_link": "https://unofficialblog.com/exams/ias-2027",
        "notification_pdf": "",
        "application_start_date": "2027-02-01",
        "last_date": "2027-01-30", # start > last (invalid)
        "exam_date": "2027-05-15"
    }
    score2, reason2, official2 = AIScanner.calculate_confidence(sug2)
    assert score2 == 25, f"Expected 25, got {score2}. Reason: {reason2}"
    assert official2 is False
    print("[OK] AI Confidence score formula tests passed.")

def test_duplicate_intelligence():
    print("Testing Duplicate Intelligence...")
    db = SessionLocal()
    try:
        # Standardize aliases
        assert AIScanner.normalize_exam_name("UPSC CSE 2027") == "civil services examination 2027"
        assert AIScanner.normalize_exam_name("JEE Main 2027") == "jee main 2027"
        
        # Add a test exam
        exam = models.Exam(
            name="UPSC CSE 2027",
            conducting_org="UPSC",
            level="Graduate",
            category="Government Exams",
            official_link="https://upsc.gov.in"
        )
        db.add(exam)
        db.commit()
        db.refresh(exam)
        
        # Verify CSE vs Civil Services mapping works
        is_dup1 = AIScanner.check_duplicate(db, "Civil Services Examination 2027", "UPSC")
        assert is_dup1 is True, "Expected Civil Services Examination to match UPSC CSE"
        
        # Clean up
        db.delete(exam)
        db.commit()
        print("[OK] Duplicate Intelligence tests passed.")
    finally:
        db.close()

def test_expired_exams_archiver():
    print("Testing Expired Exams Archiver...")
    db = SessionLocal()
    try:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        past_date = (datetime.utcnow() - timedelta(days=5)).strftime("%Y-%m-%d")
        future_date = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Create a test exam that is expired (last date passed)
        exam_expired = models.Exam(
            name="Expired Test Exam 2026",
            conducting_org="Test Org",
            level="12th",
            category="Engineering Exams",
            last_date=past_date,
            status="Application Open"
        )
        db.add(exam_expired)
        db.commit()
        
        # Run checker
        res = AIScanner.check_and_update_expired_exams(db)
        db.refresh(exam_expired)
        
        assert exam_expired.status == "Application Closed", f"Expected Application Closed, got {exam_expired.status}"
        assert res["closed"] >= 1
        
        # Clean up
        db.delete(exam_expired)
        db.commit()
        print("[OK] Expired Exams Archiver tests passed.")
    finally:
        db.close()

def test_settings_and_analytics():
    print("Testing Settings and Analytics endpoints...")
    db = SessionLocal()
    try:
        # Create admin user
        admin = models.User(
            email="test_admin@examhub.com",
            full_name="Test Admin",
            hashed_password="pw",
            is_admin=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        # Test update settings
        payload = SystemSettingsUpdate(daily_auto_scan=True)
        res_set = update_ai_settings(payload, db, admin)
        assert res_set["daily_auto_scan"] is True
        
        # Test get settings
        res_get = get_ai_settings(db, admin)
        assert res_get["daily_auto_scan"] is True
        
        # Test analytics
        res_an = get_ai_analytics(db, admin)
        assert "scanned_today" in res_an
        assert "sources_checked" in res_an
        assert len(res_an["sources_checked"]) == 8
        
        # Clean up setting & user
        db.query(models.SystemSetting).filter(models.SystemSetting.key == "daily_auto_scan").delete()
        db.delete(admin)
        db.commit()
        print("[OK] Settings and Analytics endpoints tests passed.")
    finally:
        db.close()

if __name__ == "__main__":
    try:
        # Ensure tables are created
        Base.metadata.create_all(bind=engine)
        test_confidence_score_formula()
        test_duplicate_intelligence()
        test_expired_exams_archiver()
        test_settings_and_analytics()
        print("\nAll Autonomous Agent tests completed successfully!")
    except AssertionError as e:
        print(f"\nAssertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nException occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
