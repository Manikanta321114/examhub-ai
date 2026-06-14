import os
from typing import List, Dict, Any

class MockAIProvider:
    @staticmethod
    def get_suggestions() -> List[Dict[str, Any]]:
        # Returns a structured list of mock suggestions representing Feature 1, 2, and 3 findings.
        return [
            # Feature 1: New Exam Detected (Graduate level, Government)
            {
                "type": "new",
                "name": "SBI PO Examination 2027",
                "conducting_org": "State Bank of India (SBI)",
                "description": "Recruitment of Probationary Officers (PO) in State Bank of India. The examination has three phases: Preliminary, Mains, and Group Exercises/Interview.",
                "level": "Graduate",
                "eligibility": "Graduation in any discipline from a recognized University or any equivalent qualification.",
                "application_start_date": "2027-09-01",
                "last_date": "2027-09-22",
                "exam_date": "2027-11-20",
                "application_fee": "Rs. 750 (General/OBC), Nil (SC/ST/PwBD)",
                "mode": "Online (Computer Based Test)",
                "category": "Banking Exams",
                "official_link": "https://sbi.co.in/web/careers",
                "syllabus_link": "https://sbi.co.in/web/careers/syllabus-po-2027",
                "papers_link": "https://sbi.co.in/web/careers/past-papers-po",
                "notification_pdf": "https://sbi.co.in/web/careers/documents/notification-po-2027.pdf",
                "source_url": "https://sbi.co.in/web/careers",
                "source_name": "Official SBI Careers Portal",
                "detected_date": "2026-06-14",
                "confidence_score": 96,
                "confidence_reason": "High matching rate on career pages and extracted PDF bulletin matches standard layout."
            },
            # Feature 2: Year Update Detected (GATE 2026/existing to GATE 2027)
            {
                "type": "update",
                "target_exam_name": "GATE (Graduate Aptitude Test in Engineering)", # target for matching existing
                "name": "GATE 2027 (Graduate Aptitude Test in Engineering)",
                "conducting_org": "Indian Institute of Science (IISc) & IITs",
                "description": "An examination that primarily tests the comprehensive understanding of various undergraduate subjects in engineering and science.",
                "level": "UG",
                "eligibility": "Currently studying in 3rd or higher year of UG, or completed degree in engineering/science.",
                "application_start_date": "2027-08-30",
                "last_date": "2027-10-15", # updated last date
                "exam_date": "2027-02-06",
                "application_fee": "Rs. 1800 (General), Rs. 900 (Female/SC/ST)",
                "mode": "Online (Computer Based Test)",
                "category": "Engineering Exams",
                "official_link": "https://gate2027.iisc.ac.in", # updated official link year
                "syllabus_link": "https://gate2027.iisc.ac.in/syllabus/",
                "papers_link": "https://gate.iisc.ac.in/previous-question-papers/",
                "notification_pdf": "https://gate2027.iisc.ac.in/brochure/gate_2027_brochure.pdf",
                "source_url": "https://gate.iisc.ac.in",
                "source_name": "IISc GATE Portal",
                "detected_date": "2026-06-14",
                "confidence_score": 98,
                "confidence_reason": "Official brochure PDF found at target sub-domain containing complete dates schedule."
            },
            # Feature 2: Year Update Detected (NEET UG 2026 -> NEET UG 2027)
            {
                "type": "update",
                "target_exam_name": "NEET UG",
                "name": "NEET UG 2027",
                "conducting_org": "National Testing Agency (NTA)",
                "description": "The National Eligibility cum Entrance Test (Undergraduate) is an all-India pre-medical entrance test.",
                "level": "12th",
                "eligibility": "Passed 10+2 with Physics, Chemistry, Biology/Biotechnology, and English as core subjects.",
                "application_start_date": "2027-02-09",
                "last_date": "2027-03-16",
                "exam_date": "2027-05-02",
                "application_fee": "Rs. 1700 (General), Rs. 1000 (SC/ST)",
                "mode": "Offline (Pen & Paper)",
                "category": "Medical Exams",
                "official_link": "https://neet.nta.nic.in",
                "syllabus_link": "https://neet.nta.nic.in/syllabus/",
                "papers_link": "https://neet.nta.nic.in/question-papers/",
                "notification_pdf": "https://neet.nta.nic.in/documents/information-bulletin-2027.pdf",
                "source_url": "https://neet.nta.nic.in",
                "source_name": "NTA NEET Portal",
                "detected_date": "2026-06-14",
                "confidence_score": 75,
                "confidence_reason": "Extracted dates from tentative official notification table. Needs manual confirmation of final brochure."
            },
            # Feature 3: Expired/Outdated Exam Warning (UPSC CSE 2026 is outdated - last date was 2026-03-05)
            {
                "type": "expired",
                "target_exam_name": "UPSC Civil Services Examination",
                "name": "UPSC Civil Services Examination",
                "conducting_org": "Union Public Service Commission (UPSC)",
                "description": "The Civil Services Examination (CSE) is a national competitive examination in India.",
                "level": "Graduate",
                "eligibility": "Bachelor's degree from a recognized university.",
                "application_start_date": "2026-02-01",
                "last_date": "2026-03-05",
                "exam_date": "2026-05-26",
                "application_fee": "Rs. 100",
                "mode": "Offline (Pen & Paper)",
                "category": "Government Exams",
                "official_link": "https://upsc.gov.in",
                "syllabus_link": "https://upsc.gov.in/examinations/syllabus",
                "papers_link": "https://upsc.gov.in/examinations/previous-question-papers",
                "notification_pdf": "https://upsc.gov.in/sites/default/files/Notification-CSM-2026.pdf",
                "source_url": "https://upsc.gov.in",
                "source_name": "UPSC Official Calendar",
                "detected_date": "2026-06-14",
                "confidence_score": 100,
                "confidence_reason": "Last date of application was 2026-03-05, which is older than current system date. Exam status is closed."
            }
        ]

class AIProvider:
    @staticmethod
    def scan_exams(mode: str = "quick") -> List[Dict[str, Any]]:
        # Check provider and connect to Gemini if configured
        provider = os.getenv("AI_PROVIDER", "mock")
        api_key = os.getenv("GEMINI_API_KEY")
        
        if provider == "gemini" and api_key:
            try:
                from google import genai
                from google.genai import types
                import json
                import re
                from datetime import datetime
                
                client = genai.Client(api_key=api_key)
                today_str = datetime.utcnow().strftime("%Y-%m-%d")
                
                if mode == "quick":
                    prompt = f"""
                    You are an Autonomous Indian Exam Data Agent running a QUICK SCAN.
                    Search the live web using Google Search to check the official portals of major Indian exam bodies for the latest updates on dates, application openings, changes, and notifications for the academic year 2026/2027.
                    
                    Target major official bodies:
                    - Union Public Service Commission (UPSC) (upsc.gov.in)
                    - Staff Selection Commission (SSC) (ssc.gov.in)
                    - National Testing Agency (NTA) (nta.ac.in)
                    - Institute of Banking Personnel Selection (IBPS) (ibps.in)
                    - State Bank of India (SBI) (sbi.co.in/web/careers)
                    - Railway Recruitment Board (RRB) (indianrailways.gov.in)
                    - Indian Defence (Army, Navy, Air Force, NDA, CDS)
                    - State PSC websites (KPSC Karnataka, MPSC Maharashtra, etc.)
                    
                    Focus strictly on finding:
                    1. Updates to existing exams (e.g. date changes, application window openings, deadline updates).
                    2. Official notification PDF links and syllabus page links.
                    
                    Return a JSON list of suggestion objects. Each object MUST strictly follow this structure:
                    {{
                        "type": "update" | "expired",
                        "target_exam_name": "Standard name of the existing exam (e.g. 'GATE' or 'NEET UG' or 'UPSC CSE' or 'SBI PO' or 'IBPS Clerk') being updated or expired",
                        "name": "Full name of the exam with year (e.g. 'GATE 2027' or 'SBI PO 2027')",
                        "conducting_org": "Full name of conducting organization (e.g. 'National Testing Agency')",
                        "description": "A brief description of this exam and the update.",
                        "level": "10th" | "12th" | "UG" | "Graduate",
                        "eligibility": "Educational and age eligibility.",
                        "application_start_date": "YYYY-MM-DD (or null if not announced)",
                        "last_date": "YYYY-MM-DD (or null if not announced)",
                        "exam_date": "YYYY-MM-DD (or null if not announced)",
                        "application_fee": "Fee details (e.g. 'Rs. 750 for General')",
                        "mode": "Online" | "Offline" | "Hybrid",
                        "category": "Government Exams" | "Engineering Exams" | "Medical Exams" | "Banking Exams" | "College Entrance Exams" | "Defence Exams" | "Teaching Exams",
                        "official_link": "Official URL to the exam page (must start with http)",
                        "syllabus_link": "URL to the official syllabus (must start with http, or null)",
                        "papers_link": "URL to previous papers (must start with http, or null)",
                        "notification_pdf": "URL to the official notification PDF (must start with http, or null)",
                        "source_url": "URL of the page where you found this information (must start with http)",
                        "source_name": "Name of the source website",
                        "detected_date": "{today_str}",
                        "confidence_score": 0-100 integer,
                        "confidence_reason": "Provide detail of why you have this confidence level.",
                        "source_verified": true/false (true only if the official URL starts with a trusted government/org domain like .gov.in, .nic.in, .ac.in, .edu.in or the official portal)
                    }}
                    
                    Return ONLY a raw JSON array containing these objects. Do not wrap in ```json code fences.
                    """
                else: # deep scan
                    prompt = f"""
                    You are an Autonomous Indian Exam Data Agent running a DEEP SCAN.
                    Search the live web using Google Search for completely new competitive exams, new government job categories, new conducting organizations, and new opportunities for the year 2026/2027.
                    
                    Look across UPSC, SSC, NTA, Defence, Railways, IBPS, SBI, Teaching, and State PSCs.
                    Focus strictly on finding:
                    1. Completely new exams, test frameworks, or recruitment posts not previously listed.
                    2. New opportunities, entrance tests, or certification schemes.
                    
                    Return a JSON list of suggestion objects. Each object MUST strictly follow this structure:
                    {{
                        "type": "new",
                        "target_exam_name": null,
                        "name": "Full name of the new exam with year (e.g. 'RRB ALP 2027')",
                        "conducting_org": "Full name of conducting organization",
                        "description": "A brief description of this new exam and post details.",
                        "level": "10th" | "12th" | "UG" | "Graduate",
                        "eligibility": "Educational and age eligibility.",
                        "application_start_date": "YYYY-MM-DD (or null if not announced)",
                        "last_date": "YYYY-MM-DD (or null if not announced)",
                        "exam_date": "YYYY-MM-DD (or null if not announced)",
                        "application_fee": "Fee details",
                        "mode": "Online" | "Offline" | "Hybrid",
                        "category": "Government Exams" | "Engineering Exams" | "Medical Exams" | "Banking Exams" | "College Entrance Exams" | "Defence Exams" | "Teaching Exams",
                        "official_link": "Official URL to the exam page (must start with http)",
                        "syllabus_link": "URL to the official syllabus (must start with http, or null)",
                        "papers_link": "URL to previous papers (must start with http, or null)",
                        "notification_pdf": "URL to the official notification PDF (must start with http, or null)",
                        "source_url": "URL of the page where you found this information (must start with http)",
                        "source_name": "Name of the source website",
                        "detected_date": "{today_str}",
                        "confidence_score": 0-100 integer,
                        "confidence_reason": "Provide detail of why you have this confidence level.",
                        "source_verified": true/false (true only if the official URL starts with a trusted government/org domain like .gov.in, .nic.in, .ac.in, .edu.in or the official portal)
                    }}
                    
                    Return ONLY a raw JSON array containing these objects. Do not wrap in ```json code fences.
                    """

                res = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type='application/json',
                        tools=[{"google_search": {}}]
                    )
                )
                
                # Strip code block decorators if present
                clean_text = res.text.strip()
                if clean_text.startswith("```"):
                    clean_text = re.sub(r"^```[a-zA-Z]*\n", "", clean_text)
                    clean_text = re.sub(r"\n```$", "", clean_text)
                
                suggestions = json.loads(clean_text)
                if isinstance(suggestions, list):
                    return suggestions
            except Exception as e:
                print(f"Gemini scan_exams error, falling back to mock: {e}")
                
        # Fallback to mock, filtering by mode for consistency
        mock_suggestions = MockAIProvider.get_suggestions()
        if mode == "quick":
            return [s for s in mock_suggestions if s.get("type") in ["update", "expired"]]
        else:
            return [s for s in mock_suggestions if s.get("type") == "new"]
