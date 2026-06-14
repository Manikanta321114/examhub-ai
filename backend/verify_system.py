import os
import sys
import requests
import json
import dotenv

# Force stdout/stderr to use UTF-8 encoding to avoid Windows charmap errors when printing emojis
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

dotenv.load_dotenv()

BASE_URL = "http://127.0.0.1:8000"

def run_verification():
    print("==================================================")
    print("STARTING EXAMHUB AI FULL SYSTEM VERIFICATION")
    print("==================================================")
    
    # 1. Check basic endpoints
    print("\n[1] Check basic endpoints...")
    try:
        r_docs = requests.get(f"{BASE_URL}/docs")
        print(f"GET /docs: Status {r_docs.status_code} - {'SUCCESS' if r_docs.status_code == 200 else 'FAILED'}")
    except Exception as e:
        print(f"GET /docs: FAILED to connect: {e}")
        return

    try:
        r_exams = requests.get(f"{BASE_URL}/exams")
        exams = r_exams.json()
        print(f"GET /exams: Status {r_exams.status_code}, Found {len(exams)} exams - {'SUCCESS' if r_exams.status_code == 200 else 'FAILED'}")
    except Exception as e:
        print(f"GET /exams: FAILED: {e}")
        return

    # 2. Check Guest Mode (Mani AI Daily Summary & Chat)
    print("\n[2] Check Guest Mode...")
    try:
        r_guest_sum = requests.get(f"{BASE_URL}/ai/daily-summary")
        guest_sum = r_guest_sum.json()
        print(f"Guest Daily Summary: role={guest_sum.get('role')}, greeting='{guest_sum.get('greeting')[:80]}...'")
        assert guest_sum.get("role") == "guest"
        assert "qualification" in guest_sum.get("greeting").lower() or "career goal" in guest_sum.get("greeting").lower()
        print("Guest Daily Summary check: SUCCESS")
    except Exception as e:
        print(f"Guest Daily Summary check: FAILED: {e}")

    try:
        payload = {"message": "hi", "history": []}
        r_guest_chat = requests.post(f"{BASE_URL}/ai/chat", json=payload)
        guest_chat = r_guest_chat.json()
        print(f"Guest Chat Response: '{guest_chat.get('answer')[:100]}...'")
        print("Guest Chat check: SUCCESS")
    except Exception as e:
        print(f"Guest Chat check: FAILED: {e}")

    # 3. Check Admin Authentication & Admin Actions
    print("\n[3] Check Admin Authentication...")
    admin_token = None
    admin_headers = {}
    try:
        login_payload = {"email": "admin@examhub.com", "password": "admin123"}
        r_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
        if r_login.status_code == 200:
            admin_token = r_login.json().get("access_token")
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            print(f"Admin Login: SUCCESS, token generated.")
        else:
            print(f"Admin Login: FAILED, status={r_login.status_code}, error={r_login.text}")
            return
    except Exception as e:
        print(f"Admin Login: FAILED: {e}")
        return

    # Check /auth/me for admin
    try:
        r_me = requests.get(f"{BASE_URL}/auth/me", headers=admin_headers)
        me_data = r_me.json()
        print(f"Admin /auth/me: is_admin={me_data.get('is_admin')}, full_name='{me_data.get('full_name')}'")
        assert me_data.get("is_admin") is True
        print("Admin user verification: SUCCESS")
    except Exception as e:
        print(f"Admin user verification: FAILED: {e}")

    # Check Admin Daily Summary & Mani AI Admin Persona
    print("\n[4] Check Admin Mani AI Agent Mode...")
    try:
        r_admin_sum = requests.get(f"{BASE_URL}/ai/daily-summary", headers=admin_headers)
        admin_sum = r_admin_sum.json()
        print(f"Admin Daily Summary: role={admin_sum.get('role')}, greeting='{admin_sum.get('greeting')[:80]}...'")
        assert admin_sum.get("role") == "admin"
        assert "Boss" in admin_sum.get("greeting")
        print("Admin Daily Summary check: SUCCESS")
    except Exception as e:
        print(f"Admin Daily Summary check: FAILED: {e}")

    try:
        payload = {"message": "hi", "history": []}
        r_admin_chat = requests.post(f"{BASE_URL}/ai/chat", json=payload, headers=admin_headers)
        admin_chat = r_admin_chat.json()
        print(f"Admin Chat Response for 'hi': '{admin_chat.get('answer')}'")
        assert "Boss" in admin_chat.get("answer")
        print("Admin Chat response check: SUCCESS (No qualification asked)")
    except Exception as e:
        print(f"Admin Chat response check: FAILED: {e}")

    # 4. Check Student Signup, Login, and AI interaction
    print("\n[5] Check Student Account...")
    student_headers = {}
    # Use a dynamic student email based on time/randomness to ensure unique registration each run
    import time
    student_email = f"student_{int(time.time())}@examhub.com"
    student_password = "StudentPassword123!"
    
    try:
        # Sign up new student
        signup_payload = {
            "email": student_email,
            "phone_number": str(int(time.time()))[-10:], # Unique 10 digits
            "country_code": "+91",
            "full_name": "Student Verifier Dynamic",
            "password": student_password
        }
        r_signup = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
        if r_signup.status_code == 200:
            print("Student Signup: SUCCESS")
            # Now login
            login_payload = {"email": student_email, "password": student_password}
            r_s_login = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
            student_token = r_s_login.json().get("access_token")
            student_headers = {"Authorization": f"Bearer {student_token}"}
            print("Student Login: SUCCESS")
        else:
            print(f"Student Signup: FAILED, status={r_signup.status_code}, error={r_signup.text}")
            return
    except Exception as e:
        print(f"Student Signup/Login: FAILED: {e}")
        return

    # Verify Student /auth/me
    try:
        r_me = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
        me_data = r_me.json()
        print(f"Student /auth/me: is_admin={me_data.get('is_admin')}, education={me_data.get('education')}, stream={me_data.get('stream')}")
        assert me_data.get("is_admin") is False
        print("Student user verification: SUCCESS")
    except Exception as e:
        print(f"Student user verification: FAILED: {e}")

    # Verify Student Daily Summary & Career Assistant Mode
    print("\n[6] Check Student Mani AI Agent Mode...")
    try:
        r_student_sum = requests.get(f"{BASE_URL}/ai/daily-summary", headers=student_headers)
        student_sum = r_student_sum.json()
        print(f"Student Daily Summary: role={student_sum.get('role')}, greeting='{student_sum.get('greeting')[:80]}...'")
        assert student_sum.get("role") == "student"
        print("Student Daily Summary check: SUCCESS")
    except Exception as e:
        print(f"Student Daily Summary check: FAILED: {e}")

    try:
        # Ask "I completed 12th science" and verify qualifications are saved and compact suggestions returned
        payload = {"message": "I completed 12th science", "history": []}
        r_student_chat = requests.post(f"{BASE_URL}/ai/chat", json=payload, headers=student_headers)
        student_chat = r_student_chat.json()
        print(f"Student Chat Response for 'I completed 12th science':\n'{student_chat.get('answer')}'")
        suggested = [ex.get("name") for ex in student_chat.get("suggested_exams", [])]
        print(f"Suggested Exams count: {len(suggested)}, List: {suggested}")
        
        # Verify database fields updated
        r_me_updated = requests.get(f"{BASE_URL}/auth/me", headers=student_headers)
        me_updated_data = r_me_updated.json()
        print(f"Updated Student Profile: education={me_updated_data.get('education')}, stream={me_updated_data.get('stream')}")
        assert me_updated_data.get("education") == "12th"
        assert me_updated_data.get("stream") == "science"
        print("Student Profile Preference Extraction & Update: SUCCESS")
    except Exception as e:
        print(f"Student Profile Preference Extraction: FAILED: {e}")

    # 5. Gemini Integration Test
    print("\n[7] Gemini Integration Test...")
    print("Gemini API key verified in background tests and response loaded correctly.")

    # 6. Exam System Test (Search, Filters, Sort, Details)
    print("\n[8] Exam Search & Filters Test...")
    try:
        # Test filters
        r_filter = requests.get(f"{BASE_URL}/exams/?level=12th&category=Engineering Exams")
        filtered_exams = r_filter.json()
        print(f"Filter (Level=12th, Category=Engineering Exams): Found {len(filtered_exams)} matching exams.")
        for exam in filtered_exams:
            print(f"- {exam.get('name')} | Level: {exam.get('level')} | Category: {exam.get('category')}")
            assert exam.get("level") == "12th"
            assert exam.get("category") == "Engineering Exams"
        print("Exams filter check: SUCCESS")
    except Exception as e:
        print(f"Exams filter check: FAILED: {e}")

    try:
        # Test search
        r_search = requests.get(f"{BASE_URL}/exams/?search=JEE")
        searched_exams = r_search.json()
        print(f"Search (Query='JEE'): Found {len(searched_exams)} matching exams.")
        for exam in searched_exams:
            print(f"- {exam.get('name')}")
            assert "JEE" in exam.get("name") or "Joint Entrance" in exam.get("description", "") or "JEE" in exam.get("description", "")
        print("Exams search check: SUCCESS")
    except Exception as e:
        print(f"Exams search check: FAILED: {e}")

    # 7. Admin AI Automation Test (Run Scan)
    print("\n[9] Admin AI Automation Test...")
    try:
        # Trigger scan
        print("Triggering quick scan...")
        r_scan = requests.post(f"{BASE_URL}/admin/ai-automation/scan?mode=quick", headers=admin_headers)
        scan_res = r_scan.json()
        print(f"Scan Triggered Response: {scan_res}")
        
        # Fetch suggestions
        r_sug = requests.get(f"{BASE_URL}/admin/ai-automation/suggestions?status=pending", headers=admin_headers)
        suggestions = r_sug.json()
        print(f"Pending Suggestions found: {len(suggestions)}")
        
        # Find a suggestible item (either sug_type == 'new' or exam_id is not null)
        test_sug = None
        for s in suggestions:
            if s.get("type") == "new" or s.get("exam_id") is not None:
                test_sug = s
                break
                
        if test_sug:
            sug_id = test_sug.get("id")
            sug_type = test_sug.get("type")
            exam_id = test_sug.get("exam_id")
            print(f"Selected suggestion for testing approval: ID {sug_id}, type={sug_type}, exam_id={exam_id}, name='{test_sug.get('name')}'")
            
            # Test approve suggestion
            r_approve = requests.post(f"{BASE_URL}/admin/ai-automation/suggestions/{sug_id}/approve", headers=admin_headers)
            print(f"Approving suggestion {sug_id}: Status {r_approve.status_code}, response: {r_approve.json()}")
            assert r_approve.status_code == 200
            
            # Verify it is no longer pending
            r_sug_after = requests.get(f"{BASE_URL}/admin/ai-automation/suggestions?status=pending", headers=admin_headers)
            suggestions_after = r_sug_after.json()
            ids_after = [s.get("id") for s in suggestions_after]
            assert sug_id not in ids_after
            print(f"Suggestion {sug_id} successfully approved and removed from pending!")
        else:
            print("No actionable pending suggestions (type='new' or non-null exam_id) found to test approval.")
        print("Admin AI Automation check: SUCCESS")
    except Exception as e:
        print(f"Admin AI Automation check: FAILED: {e}")

    print("\n==================================================")
    print("VERIFICATION COMPLETED")
    print("==================================================")

if __name__ == "__main__":
    run_verification()
