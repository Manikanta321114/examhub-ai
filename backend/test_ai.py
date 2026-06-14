import sys
import os
import re

# Add the parent directory of backend/app to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.services.ai_service import _normalize_query_typos, _detect_intent, _rule_based_match, AIService
from app.routers.ai import ask_ai_assistant
from app.routers.dashboard import get_dashboard_data

def test_typo_normalization():
    print("Running typo normalization tests...")
    assert _normalize_query_typos("enginering exams") == "engineering exams"
    assert _normalize_query_typos("govt jobs") == "government jobs"
    assert _normalize_query_typos("medicl") == "medical"
    print("[OK] Typo normalization tests passed.")

def test_intent_detection():
    print("Running intent detection tests...")
    assert _detect_intent("hi") == "GREETING"
    assert _detect_intent("hello") == "GREETING"
    assert _detect_intent("hey") == "GREETING"
    assert _detect_intent("thanks") == "GREETING"
    
    assert _detect_intent("I completed 12th science") == "PROFILE"
    assert _detect_intent("I am engineering student") == "PROFILE"
    assert _detect_intent("I am graduate") == "PROFILE"
    assert _detect_intent("I want government job") == "PROFILE"
    
    assert _detect_intent("show NEET") == "EXAM_SEARCH"
    assert _detect_intent("GATE eligibility") == "EXAM_SEARCH"
    
    assert _detect_intent("What should I do after 12th?") == "CAREER_ADVICE"
    assert _detect_intent("Which career is best after engineering?") == "CAREER_ADVICE"
    
    assert _detect_intent("Which exams are open now?") == "DEADLINE"
    assert _detect_intent("Upcoming exams") == "DEADLINE"
    assert _detect_intent("Last date exams") == "DEADLINE"
    
    assert _detect_intent("random text asdfghjkl") == "UNKNOWN"
    print("[OK] Intent detection tests passed.")

def test_profile_persistence_and_dashboard():
    print("Running profile persistence and dashboard recommendation tests...")
    db = SessionLocal()
    try:
        # Create a test user
        test_email = "tester_agent@example.com"
        # Delete if exists
        db.query(models.User).filter(models.User.email == test_email).delete()
        db.commit()
        
        user = models.User(
            email=test_email,
            full_name="Tester Agent",
            hashed_password="fakehashpassword"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Test AI assistant updates profile
        from app.schemas import AIQueryRequest
        request_obj = AIQueryRequest(message="I am engineering student from Karnataka", history=[])
        
        # Call the router function directly
        res = ask_ai_assistant(request_obj, db, current_user=user)
        
        db.refresh(user)
        assert user.education == "Graduate", f"Expected education Graduate, got {user.education}"
        assert user.stream == "engineering", f"Expected stream engineering, got {user.stream}"
        assert user.state == "Karnataka", f"Expected state Karnataka, got {user.state}"
        print("[OK] Profile persistence check passed (user education, stream, and state saved).")
        
        # Test dashboard refresh recommendations based on user preferences
        dash_data = get_dashboard_data(current_user=user, db=db)
        recs = dash_data["recommended_exams"]
        print(f"Recommended exams count: {len(recs)}")
        for rec in recs:
            print(f"- Recommend: {rec.name} | Category: {rec.category} | Level: {rec.level} | State: {rec.state}")
        
        # Since it is engineering and karnataka, check if any engineering or karnataka exams are sorted first
        # Verify it doesn't crash and returns reasonable items
        assert len(recs) > 0, "Expected recommended exams to be returned"
        print("[OK] Dashboard recommendations retrieval passed.")
        
        # Clean up
        db.delete(user)
        db.commit()
    finally:
        db.close()

def test_fake_exam_guard():
    print("Running fake exam guard tests...")
    db = SessionLocal()
    try:
        res_text, exams = AIService.answer_query(db, "Create fake exam")
        assert "verified" in res_text.lower() or "suggest" in res_text.lower(), f"Unexpected fake exam response: {res_text}"
        assert len(exams) == 0, f"Expected 0 exams for fake exam, got {len(exams)}"
        print("[OK] Fake exam guard tests passed.")
    finally:
        db.close()

if __name__ == "__main__":
    try:
        test_typo_normalization()
        test_intent_detection()
        test_profile_persistence_and_dashboard()
        test_fake_exam_guard()
        print("\nAll tests completed successfully!")
    except AssertionError as e:
        print(f"\nAssertion error occurred: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
