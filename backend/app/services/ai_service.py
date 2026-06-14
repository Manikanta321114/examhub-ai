import re
import os
import json
from typing import List, Tuple
from sqlalchemy.orm import Session
from .. import models


def _normalize_query_typos(q: str) -> str:
    q = q.lower()
    # Typo mappings (Point 5)
    q = re.sub(r"\benginering\b|\bengineering\b|\bengineer\b", "engineering", q)
    q = re.sub(r"\bgovt\b|\bgovernment\b", "government", q)
    q = re.sub(r"\bmedicl\b|\bmedical\b", "medical", q)
    return q


def _detect_intent(query: str) -> str:
    clean_msg = re.sub(r"[!?.,-]", "", query.strip().lower()).strip()
    clean_msg = _normalize_query_typos(clean_msg)
    
    greetings = {"hi", "hello", "hey", "thanks", "thank you", "namaste", "hola", "yo"}
    if clean_msg in greetings:
        return "GREETING"
        
    if re.search(r"\b(open\s+now|open\s+exams|closing\s+soon|upcoming|last\s+date|deadlines|deadline)\b", clean_msg):
        return "DEADLINE"
        
    if re.search(r"\b(career|what\s+should\s+i|what\s+to\s+do|how\s+to\s+become|best\s+after|which\s+career)\b", clean_msg):
        return "CAREER_ADVICE"
        
    has_profile = re.search(
        r"\b(10th|12th|matric|secondary|inter|intermediate|science|arts|commerce|ug|undergrad|undergraduate|graduate|degree|pg|postgrad|graduation|engineer|engineering|medical|bank|banking|gov|government|civil|upsc|ssc|defence|army|navy|airforce|teach|tet|ctet|karnataka|maharashtra|delhi|state)\b",
        clean_msg
    )
    if has_profile:
        return "PROFILE"
        
    has_exam_keywords = re.search(
        r"\b(show|find|search|exam|eligibility|details|syllabus|pattern|dates|gate|jee|neet|upsc|ssc|ibps|sbi|nda|cds|ctet|tet|kpsc)\b",
        clean_msg
    )
    if has_exam_keywords:
        return "EXAM_SEARCH"
        
    return "UNKNOWN"


def _pre_filter_exams(db: Session, query: str, history: List[dict] = None) -> List[models.Exam]:
    """Pre-filters exams from the database so we never send the entire database to Gemini."""
    context_queries = [query]
    if history:
        for msg in history:
            if msg.get("role") == "user":
                context_queries.append(_normalize_query_typos(msg.get("content", "").lower()))
    
    combined_query = " ".join(context_queries).lower()
    
    # Extract levels & categories
    levels = []
    if re.search(r"\b10th\b|\bmatric\b|\bsecondary\b", combined_query):
        levels.append("10th")
    if re.search(r"\b12th\b|\binter\b|\bintermediate\b|\b10\+2\b|\bhsc\b|\bscience\b|\barts\b|\bcommerce\b", combined_query):
        levels.append("12th")
    if re.search(r"\bug\b|\bundergrad\b|\bundergraduate\b", combined_query):
        levels.append("UG")
    if re.search(r"\bgraduate\b|\bdegree\b|\bpg\b|\bpostgrad\b|\bgraduation\b", combined_query):
        levels.append("Graduate")

    categories = []
    if re.search(r"\bengineering\b|\bengineer\b|\bgate\b|\btech\b|\bjee\b|\bb\.tech\b|\bcs\b|\bit\b", combined_query):
        categories.append("Engineering Exams")
    if re.search(r"\bmedical\b|\bneet\b|\bdoctor\b|\bmbbs\b|\bnursing\b", combined_query):
        categories.append("Medical Exams")
    if re.search(r"\bbank\b|\bpo\b|\bclerk\b|\bibps\b|\bsbi\b|\bfinance\b", combined_query):
        categories.append("Banking Exams")
    if re.search(r"\bgov\b|\bgovernment\b|\bcivil\b|\bupsc\b|\bssc\b|\bpublic service\b|\bias\b|\bips\b", combined_query):
        categories.append("Government Exams")
    if re.search(r"\bcollege\b|\bentrance\b|\badmission\b|\buniversity\b|\bcuet\b", combined_query):
        categories.append("College Entrance Exams")
    if re.search(r"\bdefence\b|\barmy\b|\bnavy\b|\bairforce\b|\bnda\b|\bcds\b", combined_query):
        categories.append("Defence Exams")
    if re.search(r"\bteach\b|\btet\b|\bctet\b|\beducation\b", combined_query):
        categories.append("Teaching Exams")

    query_obj = db.query(models.Exam)
    
    # Filter by level and category if detected
    if levels and categories:
        query_obj = query_obj.filter(models.Exam.level.in_(levels), models.Exam.category.in_(categories))
    elif levels:
        query_obj = query_obj.filter(models.Exam.level.in_(levels))
    elif categories:
        query_obj = query_obj.filter(models.Exam.category.in_(categories))
        
    # Also do keyword search if query contains specific words
    keywords = [w for w in re.split(r'\W+', combined_query) if len(w) > 3]
    if keywords:
        from sqlalchemy import or_
        filters = []
        for kw in keywords[:4]:
            filters.append(models.Exam.name.ilike(f"%{kw}%"))
            filters.append(models.Exam.conducting_org.ilike(f"%{kw}%"))
            filters.append(models.Exam.description.ilike(f"%{kw}%"))
            filters.append(models.Exam.category.ilike(f"%{kw}%"))
        if not (levels or categories):
            query_obj = query_obj.filter(or_(*filters))
            
    return query_obj.limit(30).all()


def _rule_based_match(db: Session, query: str, history: List[dict] = None, user_prefs: dict = None) -> Tuple[str, List[models.Exam]]:
    """Fallback rule-based exam matcher used when Gemini is unavailable."""
    query_normalized = _normalize_query_typos(query.lower())
    intent = _detect_intent(query_normalized)
    
    # 1. GREETING Intent
    if intent == "GREETING":
        # Admin-specific greeting
        if user_prefs and user_prefs.get("is_admin"):
            return "Hello Boss 👋\n\nExamHub systems are being monitored.\n\nAsk me anything or say 'Run AI Scan' to start a new scan.", []

        # Check if user already has preferences stored (Greeting Memory - Point 3)
        interest_str = ""
        combined_context = ""
        if user_prefs:
            combined_context = f"{user_prefs.get('education', '')} {user_prefs.get('stream', '')} {user_prefs.get('career_goal', '')}".lower()
        
        if "engineering" in combined_context or "engineer" in combined_context:
            interest_str = "engineering"
        elif "medical" in combined_context:
            interest_str = "medical"
        elif "government" in combined_context:
            interest_str = "government"
        elif "banking" in combined_context:
            interest_str = "banking"
        elif "12th" in combined_context:
            interest_str = "12th standard"
            
        if interest_str:
            response = f"Welcome back 👋\n\nI remember you are interested in {interest_str} opportunities.\n\nNeed latest updates?"
        else:
            response = "Hi 👋 I'm Mani.\n\nTell me your qualification or career goal and I'll find the best exams for you 🚀"
        return response, []

        
    # 2. UNKNOWN Intent
    if intent == "UNKNOWN":
        return "I can help you find exams based on your education, stream, state or career goal 😊", []
        
    # Combine query with previous user messages to preserve qualification context
    context_queries = [query_normalized]
    if history:
        for msg in history:
            if msg.get("role") == "user":
                context_queries.append(_normalize_query_typos(msg.get("content", "").lower()))
    if user_prefs:
        if user_prefs.get("education"): context_queries.append(user_prefs["education"].lower())
        if user_prefs.get("stream"): context_queries.append(user_prefs["stream"].lower())
        if user_prefs.get("career_goal"): context_queries.append(user_prefs["career_goal"].lower())
        if user_prefs.get("state"): context_queries.append(user_prefs["state"].lower())
        
    combined_query = " ".join(context_queries).lower()

    # Determine qualification/level
    levels = []
    if re.search(r"\b10th\b|\bmatric\b|\bsecondary\b", combined_query):
        levels.append("10th")
    if re.search(r"\b12th\b|\binter\b|\bintermediate\b|\b10\+2\b|\bhsc\b|\bscience\b|\barts\b|\bcommerce\b", combined_query):
        levels.append("12th")
    if re.search(r"\bug\b|\bundergrad\b|\bundergraduate\b", combined_query):
        levels.append("UG")
    if re.search(r"\bgraduate\b|\bdegree\b|\bpg\b|\bpostgrad\b|\bgraduation\b", combined_query):
        levels.append("Graduate")

    # Detect categories
    categories = []
    if re.search(r"\bengineering\b|\bengineer\b|\bgate\b|\btech\b|\bjee\b|\bb\.tech\b|\bcs\b|\bit\b", combined_query):
        categories.append("Engineering Exams")
    if re.search(r"\bmedical\b|\bneet\b|\bdoctor\b|\bmbbs\b|\bnursing\b", combined_query):
        categories.append("Medical Exams")
    if re.search(r"\bbank\b|\bpo\b|\bclerk\b|\bibps\b|\bsbi\b|\bfinance\b", combined_query):
        categories.append("Banking Exams")
    if re.search(r"\bgov\b|\bgovernment\b|\bcivil\b|\bupsc\b|\bssc\b|\bpublic service\b|\bias\b|\bips\b", combined_query):
        categories.append("Government Exams")
    if re.search(r"\bcollege\b|\bentrance\b|\badmission\b|\buniversity\b|\bcuet\b", combined_query):
        categories.append("College Entrance Exams")
    if re.search(r"\bdefence\b|\barmy\b|\bnavy\b|\bairforce\b|\bnda\b|\bcds\b", combined_query):
        categories.append("Defence Exams")
    if re.search(r"\bteach\b|\btet\b|\bctet\b|\beducation\b", combined_query):
        categories.append("Teaching Exams")

    # 3. DEADLINE Intent
    if intent == "DEADLINE":
        # Filter exams having Application Open, sorted by last date (DEADLINE filter - Point 2)
        matched_exams = db.query(models.Exam).filter(models.Exam.status == "Application Open").all()
        def get_date_key(exam):
            return exam.last_date if exam.last_date else "9999-12-31"
        matched_exams = sorted(matched_exams, key=get_date_key)
        return "Based on your profile, these opportunities match you 🚀", matched_exams

    query_obj = db.query(models.Exam)
    matched_exams = []

    if levels and categories:
        matched_exams = query_obj.filter(
            models.Exam.level.in_(levels),
            models.Exam.category.in_(categories)
        ).all()
    elif levels:
        matched_exams = query_obj.filter(models.Exam.level.in_(levels)).all()
    elif categories:
        matched_exams = query_obj.filter(models.Exam.category.in_(categories)).all()
    else:
        keywords = [w for w in query_normalized.split() if len(w) > 3]
        if keywords:
            from sqlalchemy import or_
            filters = []
            for kw in keywords[:3]:
                filters.append(models.Exam.name.ilike(f"%{kw}%"))
                filters.append(models.Exam.conducting_org.ilike(f"%{kw}%"))
                filters.append(models.Exam.description.ilike(f"%{kw}%"))
            matched_exams = query_obj.filter(or_(*filters)).limit(6).all()

    # Safety Accuracy Guard - verify existence and validity (Point 2)
    verified_exams = []
    for exam in matched_exams:
        if exam.status:
            verified_exams.append(exam)
    matched_exams = verified_exams

    if intent == "EXAM_SEARCH":
        if matched_exams:
            response = "Based on your search, here is the exam information:"
        else:
            response = "I couldn't find this exam yet. Want to suggest it?"
    elif intent == "CAREER_ADVICE":
        response = "Here is some guidance on career paths. Based on your interest, you might consider these exams:"
    else: # PROFILE
        if matched_exams:
            response = "Based on your profile, these opportunities match you 🚀"
        else:
            response = "I couldn't find any exams matching your profile. Please try adjusting your qualification or career interest! 😊"

    return response, matched_exams


class AIService:
    @staticmethod
    def answer_query(db: Session, query: str, history: List[dict] = None, user_prefs: dict = None) -> Tuple[str, List[models.Exam]]:
        """
        Processes a student query using Gemini AI with full exam database context.
        Falls back to rule-based matching if Gemini is unavailable.
        """
        api_key = os.environ.get("GEMINI_API_KEY")
        provider = os.environ.get("AI_PROVIDER", "local")

        query_normalized = _normalize_query_typos(query)

        # Security check for fake exam requests
        if "fake" in query_normalized:
            return "I couldn't find verified information", []

        intent = _detect_intent(query_normalized)
        
        # Pre-detect simple greeting or unknown for fast short-circuited response if offline
        if intent == "GREETING" and (provider != "gemini" or not api_key):
            return _rule_based_match(db, query, history, user_prefs)

        if provider == "gemini" and api_key:
            try:
                from google import genai

                # Pre-filter database entries (never send all 1000+ entries)
                filtered_exams = _pre_filter_exams(db, query_normalized, history)
                exams_context = [
                    {
                        "id": exam.id,
                        "name": exam.name,
                        "conducting_org": exam.conducting_org,
                        "level": exam.level,
                        "category": exam.category,
                        "status": exam.status or "Upcoming",
                        "state": exam.state or "All India",
                        "difficulty_level": exam.difficulty_level or "Moderate",
                        "eligibility": (exam.eligibility or "")[:120],
                        "career_outcome": exam.career_outcome or "",
                        "last_date": exam.last_date or "",
                        "exam_date": exam.exam_date or "",
                        "description": (exam.description or "")[:100],
                    }
                    for exam in filtered_exams
                ]

                client = genai.Client(api_key=api_key)

                # Format chat history and user profile context for prompt
                history_context = ""
                if history:
                    history_context = "Conversation history for context:\n"
                    for msg in history:
                        role = "Student" if msg.get("role") == "user" else "Mani"
                        history_context += f"{role}: {msg.get('content')}\n"
                    history_context += "\n"
                
                profile_context = ""
                if user_prefs:
                    profile_context = "Student profile preferences from database:\n"
                    for k, v in user_prefs.items():
                        if v:
                            profile_context += f"- {k.capitalize()}: {v}\n"
                    profile_context += "\n"

                # Build role-aware persona
                is_admin = user_prefs.get("is_admin", False) if user_prefs else False
                persona = (
                    "You are Mani, an AI employee managing ExamHub for the admin Boss. "
                    "When admin says hi/hello, respond as their assistant: 'Hello Boss 👋\nExamHub systems are being monitored.\nAsk me anything or say Run AI Scan.' "
                    "Never ask admin for their qualification. Focus on exam management tasks."
                ) if is_admin else (
                    "You are Mani, a friendly and expert Indian career assistant on ExamHub AI. "
                    "Your goal: Guide students through education streams, exams, deadlines, and potential career paths based on their qualifications."
                )

                prompt = f"""{persona}

Available Exams Database (Pre-filtered subset):
{json.dumps(exams_context, indent=2)}

{profile_context}{history_context}{"Admin's" if is_admin else "Student's"} Message: "{query}"

Instructions:
- {"For admin: help with exam management, scans, approvals, and system monitoring." if is_admin else "Analyze the student's qualification level, interests, goals, and location."}
- Keep in mind the conversation history and profile preferences to understand follow-up questions (e.g. if the profile states education is Engineering and student asks "government exams?", show government exams suitable for engineering).
- Classify the query's intent into one of: `GREETING`, `DEADLINE`, `CAREER_ADVICE`, `PROFILE`, `EXAM_SEARCH`, `UNKNOWN`.
  - If intent is `GREETING`:
    {"- Respond as admin assistant: 'Hello Boss 👋\nExamHub systems are being monitored.'" if is_admin else '- If student profile preferences exist, greet them with: "Welcome back 👋\n\nI remember you are interested in [their interest] opportunities.\n\nNeed latest updates?"'}
    {"" if is_admin else '- Else, greet them with: "Hi 👋 I\'m Mani.\n\nTell me your qualification or career goal and I\'ll find the best exams for you 🚀"'}
  - If intent is `UNKNOWN`: respond exactly with: "I can help you find exams based on your education, stream, state or career goal 😊"
  - If intent is `DEADLINE`: filter matching exams by open/upcoming deadlines and sort them in the matched_exam_ids list.
  - If intent is `CAREER_ADVICE`: write a short career guide paragraph first, then match related exams.
- Never invent exams. If the query asks for fake exams, fictitious exam names, or exams not found in the database, return: "I couldn't find verified information" or "I couldn't find this exam yet. Want to suggest it?"
- Keep responses short (1-2 sentences). Do not generate huge paragraphs.
- Never return the suggestion prompt "I couldn't find this exam yet. Want to suggest it?" for GREETING, PROFILE, CAREER_ADVICE, or UNKNOWN intents. Only return it for EXAM_SEARCH when no exams are found.
- If no matching exams are found for PROFILE or CAREER_ADVICE, write a friendly response (e.g. 'I couldn't find matching exams. Try search terms like engineering or 12th science!') instead of suggest exam prompt.
- Respond in English by default. If the query is in Kannada or Hindi, respond in that language.

Return a JSON object with exactly this structure:
{{
  "intent": "PROFILE",
  "response": "Your short reply here.",
  "matched_exam_ids": [1, 4, 7]
}}

Only include exam IDs that are genuinely relevant to the student's query.
"""

                res = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )

                data = json.loads(res.text)
                intent_detected = data.get("intent", "PROFILE")
                natural_response = data.get("response", "").strip()
                matched_ids = [int(i) for i in data.get("matched_exam_ids", []) if str(i).isdigit()]

                # Load and verify from database (Safety accuracy guard - Point 2)
                matched_exams = []
                if matched_ids:
                    db_exams = db.query(models.Exam).filter(models.Exam.id.in_(matched_ids)).all()
                    for exam in db_exams:
                        if exam.status:
                            matched_exams.append(exam)

                # Post-processing overrides for safety mapping
                if intent_detected == "GREETING":
                    matched_exams = []
                elif intent_detected == "UNKNOWN":
                    natural_response = "I can help you find exams based on your education, stream, state or career goal 😊"
                    matched_exams = []

                # Production Logging (Point 7)
                env = os.environ.get("ENV", "development").lower()
                if env != "production":
                    print("=" * 40)
                    print(f"Intent detected: {intent_detected}")
                    print(f"Matched exams: {len(matched_exams)}")
                    print(f"Gemini used: True")
                    print("=" * 40)

                final_res = natural_response

            except Exception as e:
                print(f"[Mani AI] Gemini error, falling back to rule-based: {e}")
                final_res, matched_exams = _rule_based_match(db, query, history, user_prefs)

        else:
            final_res, matched_exams = _rule_based_match(db, query, history, user_prefs)

        # Production Logging (Point 7)
        env = os.environ.get("ENV", "development").lower()
        if env != "production":
            print("=" * 40)
            print(f"Intent detected: {_detect_intent(query_normalized)}")
            print(f"Matched exams: {len(matched_exams)}")
            print(f"Gemini used: False")
            print("=" * 40)

        # Apply guest formatting override
        if not user_prefs and matched_exams:
            preview_list = []
            for ex in matched_exams[:3]:
                emoji = "🎓"
                cat_lower = (ex.category or "").lower()
                if "medical" in cat_lower: emoji = "🏥"
                elif "defence" in cat_lower: emoji = "🪖"
                elif "bank" in cat_lower: emoji = "🏦"
                elif "gov" in cat_lower: emoji = "🏛️"
                preview_list.append(f"{emoji} {ex.name}")
            opportunities_str = "\n".join(preview_list)
            final_res = (
                f"I found opportunities like:\n\n"
                f"{opportunities_str}\n\n"
                f"Create a free account to:\n"
                f"✓ Save exams\n"
                f"✓ Get deadline alerts\n"
                f"✓ Personalized recommendations 🚀"
            )

        return final_res, matched_exams
