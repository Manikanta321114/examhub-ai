import re
import json
from datetime import datetime
from sqlalchemy.orm import Session
from .. import models
from .ai_provider import AIProvider
from typing import Tuple, List, Dict, Any

def notify_matching_students(db: Session, exam: models.Exam, is_new: bool = True):
    users = db.query(models.User).all()
    action_str = "opened" if exam.status == "Application Open" else ("added" if is_new else "updated")
    
    for user in users:
        has_matching_interest = False
        is_profile_matched = False
        
        # Check profile preferences first (7. Student Notifications)
        if user.education and exam.level:
            ue = user.education.lower()
            el = exam.level.lower()
            if el in ue or ue in el:
                is_profile_matched = True
        if user.career_goal and exam.category:
            ucg = user.career_goal.lower()
            ec = exam.category.lower()
            if ucg in ec or ec in ucg:
                is_profile_matched = True
        if user.stream and exam.category:
            ust = user.stream.lower()
            ec = exam.category.lower()
            if ust in ec or ec in ust:
                is_profile_matched = True
                
        for saved in user.saved_exams:
            if saved.category == exam.category or saved.level == exam.level:
                has_matching_interest = True
                break
        
        # Determine message based on profile match
        if is_profile_matched:
            message = f"🎓 New exam matching your profile: {exam.name}"
        else:
            message = f"New {exam.category} update: {exam.name} ({exam.conducting_org}) has been {action_str}!"
            
        if is_profile_matched or has_matching_interest or len(user.saved_exams) == 0:
            notif = models.Notification(
                user_id=user.id,
                message=message,
                created_at=datetime.utcnow().isoformat() + "Z",
                is_read=False
            )
            db.add(notif)
    db.commit()

class AIScanner:
    @staticmethod
    def normalize_exam_name(name: str) -> str:
        name_lower = name.lower().strip()
        name_lower = re.sub(r"[-.,_]", " ", name_lower)
        name_lower = re.sub(r"\s+", " ", name_lower)

        mappings = [
            (r"\bgraduate aptitude test in engineering\b|\bgate\b", "gate"),
            (r"\bjoint entrance examination\b|\bjee main\b|\bjee\b", "jee main"),
            (r"\bnational eligibility cum entrance test\b|\bneet ug\b|\bneet\b", "neet ug"),
            (r"\bcivil services examination\b|\bupsc cse\b|\bcse\b", "civil services examination"),
            (r"\bunion public service commission\b", "upsc"),
            (r"\bprobationary officer\b", "po"),
        ]

        for pattern, replacement in mappings:
            name_lower = re.compile(pattern).sub(replacement, name_lower)
            
        return name_lower

    @classmethod
    def check_duplicate(cls, db: Session, target_name: str, conducting_org: str) -> bool:
        target_norm = cls.normalize_exam_name(target_name)
        target_year_match = re.search(r"\b(202\d|203\d)\b", target_name)
        target_year = target_year_match.group(1) if target_year_match else None
        target_base = re.sub(r"\b(202\d|203\d)\b", "", target_norm).strip()
        
        aliases = {
            "upsc cse": "civil services examination",
            "civil services examination": "upsc cse",
            "jee main": "joint entrance examination",
            "joint entrance examination": "jee main",
            "neet ug": "national eligibility cum entrance test",
            "national eligibility cum entrance test": "neet ug",
            "gate": "graduate aptitude test in engineering",
            "graduate aptitude test in engineering": "gate",
        }
        
        existing_exams = db.query(models.Exam).all()
        for exam in existing_exams:
            exam_norm = cls.normalize_exam_name(exam.name)
            exam_year_match = re.search(r"\b(202\d|203\d)\b", exam.name)
            exam_year = exam_year_match.group(1) if exam_year_match else None
            exam_base = re.sub(r"\b(202\d|203\d)\b", "", exam_norm).strip()
            
            if target_norm == exam_norm:
                return True
                
            if target_base == exam_base or aliases.get(target_base) == exam_base or target_base == aliases.get(exam_base):
                if target_year == exam_year or not target_year or not exam_year:
                    org1 = (conducting_org or "").lower().strip()
                    org2 = (exam.conducting_org or "").lower().strip()
                    if org1 in org2 or org2 in org1 or not org1 or not org2:
                        return True
                        
        return False

    @classmethod
    def calculate_confidence(cls, sug: dict) -> Tuple[int, str, bool]:
        score = 0
        reasons = []
        is_official = False
        
        # 1. Official domains level 1 list (Source Priority System)
        official_domains = [
            "upsc.gov.in",
            "ssc.gov.in",
            "nta.ac.in",
            "ibps.in",
            "joinindianarmy.nic.in",
            "indianrailways.gov.in"
        ]
        
        link = (sug.get("official_link") or sug.get("source_url") or "").lower()
        
        # Match Level 1 official list
        has_official = False
        for domain in official_domains:
            if domain in link:
                has_official = True
                break
                
        # Also check state PSC/general government domains
        if not has_official:
            if "psc" in link and (".gov.in" in link or ".nic.in" in link):
                has_official = True
            elif link.endswith(".gov.in") or ".gov.in/" in link or link.endswith(".nic.in") or ".nic.in/" in link:
                has_official = True
                
        if has_official:
            score += 40
            is_official = True
            reasons.append("Official official_source domain matched (+40)")
        else:
            reasons.append("Unofficial source (+0)")
            
        # 2. Complete required fields (+25)
        required_fields = ["name", "conducting_org", "level", "category", "official_link"]
        missing = [f for f in required_fields if not sug.get(f) or not str(sug.get(f)).strip()]
        if not missing:
            score += 25
            reasons.append("All required fields completed (+25)")
        else:
            reasons.append(f"Missing required fields {missing} (+0)")
            
        # 3. PDF notification found (+20)
        pdf = (sug.get("notification_pdf") or "").lower()
        if pdf and (".pdf" in pdf or "pdf" in pdf):
            score += 20
            reasons.append("Official notification PDF found (+20)")
        else:
            reasons.append("No notification PDF (+0)")
            
        # 4. Date validation (+15)
        start = sug.get("application_start_date")
        last = sug.get("last_date")
        exam = sug.get("exam_date")
        
        dates_valid = True
        dates_present = False
        
        try:
            if start and last:
                dates_present = True
                if start > last:
                    dates_valid = False
            if last and exam:
                dates_present = True
                if last > exam:
                    dates_valid = False
            if start and exam:
                dates_present = True
                if start > exam:
                    dates_valid = False
        except Exception:
            dates_valid = False
            
        if dates_present and dates_valid:
            score += 15
            reasons.append("Dates chronologically validated (+15)")
        elif not dates_present:
            reasons.append("No dates to validate (+0)")
        else:
            reasons.append("Dates chronologically invalid (-0)")
            
        return score, "; ".join(reasons), is_official

    @classmethod
    def check_and_update_expired_exams(cls, db: Session) -> dict:
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        exams = db.query(models.Exam).all()
        
        # Helper to retrieve settings
        def get_setting_bool(key: str, default: bool) -> bool:
            s = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
            return (s.value.lower() == "true") if s else default
            
        # Check if we should update statuses automatically
        if not get_setting_bool("update_status_lifecycle", True):
            return {"closed": 0, "completed": 0}
            
        closed_count = 0
        completed_count = 0
        
        for exam in exams:
            # We don't automatically override manual Archived or Result Released status if not needed
            if exam.status == "Archived" or exam.status == "Result Released":
                continue
                
            old_status = exam.status
            
            # Progress status based on dates
            try:
                # 1. Exam completed: after exam_date passes
                if exam.exam_date and exam.exam_date < today_str:
                    exam.status = "Exam Completed"
                # 2. Application Closed: after last_date passes
                elif exam.last_date and exam.last_date < today_str:
                    exam.status = "Application Closed"
                # 3. Application Open: between start_date and last_date
                elif exam.application_start_date and exam.application_start_date <= today_str:
                    if not exam.last_date or exam.last_date >= today_str:
                        exam.status = "Application Open"
                # 4. Upcoming: before start_date
                elif exam.application_start_date and exam.application_start_date > today_str:
                    exam.status = "Upcoming"
            except Exception:
                pass
                
            if exam.status != old_status:
                if exam.status == "Application Closed":
                    closed_count += 1
                elif exam.status == "Exam Completed":
                    completed_count += 1
                    
        if closed_count > 0 or completed_count > 0:
            db.commit()
            
        return {"closed": closed_count, "completed": completed_count}

    @classmethod
    def archive_previous_year_versions(cls, db: Session, new_exam_name: str, conducting_org: str):
        # Find all exams with similar base names but older years
        new_norm = cls.normalize_exam_name(new_exam_name)
        new_year_match = re.search(r"\b(202\d|203\d)\b", new_exam_name)
        if not new_year_match:
            return
        new_year = int(new_year_match.group(1))
        new_base = re.sub(r"\b(202\d|203\d)\b", "", new_norm).strip()
        
        existing_exams = db.query(models.Exam).filter(
            models.Exam.conducting_org.ilike(conducting_org)
        ).all()
        
        for exam in existing_exams:
            exam_norm = cls.normalize_exam_name(exam.name)
            exam_year_match = re.search(r"\b(202\d|203\d)\b", exam.name)
            if not exam_year_match:
                continue
            exam_year = int(exam_year_match.group(1))
            exam_base = re.sub(r"\b(202\d|203\d)\b", "", exam_norm).strip()
            
            # If the base name is same (or normalized matches) and the year is older
            if (exam_base == new_base) and exam_year < new_year:
                if exam.status != "Archived":
                    exam.status = "Archived"
                    print(f"[Archiver] Automatically moved old exam version '{exam.name}' to Archived.")
        db.commit()

    @classmethod
    def execute_scan(cls, db: Session, mode: str = "quick") -> int:
        raw_suggestions = AIProvider.scan_exams(mode)
        new_suggestions_count = 0
        auto_published_count = 0

        # Create activity log helper
        def log_activity(action, details):
            log_entry = models.AIActivityLog(
                timestamp=datetime.utcnow().isoformat() + "Z",
                action=action,
                details=details
            )
            db.add(log_entry)

        for sug in raw_suggestions:
            name = sug.get("name")
            conducting_org = sug.get("conducting_org")
            official_link = sug.get("official_link")
            sug_type = sug.get("type", "new")
            
            # 1. Validation system check
            if not name or not conducting_org or not name.strip() or not conducting_org.strip():
                continue
            if not official_link or not official_link.strip().startswith("http"):
                continue
                
            # Compute confidence score, reasons, and official status
            confidence, reason, is_official = cls.calculate_confidence(sug)
            sug["confidence_score"] = confidence
            sug["confidence_reason"] = reason
            sug["official_source"] = is_official
            sug["source_verified"] = is_official or bool(sug.get("notification_pdf"))
            
            target_exam_name = sug.get("target_exam_name")
            
            db_exam = None
            if sug_type in ["update", "expired"] and target_exam_name:
                db_exam = db.query(models.Exam).filter(models.Exam.name.ilike(f"%{target_exam_name}%")).first()
                if not db_exam:
                    db_exam = db.query(models.Exam).filter(
                        models.Exam.conducting_org.ilike(conducting_org)
                    ).first()

            if sug_type == "new":
                is_dup = cls.check_duplicate(db, name, conducting_org)
                existing_sug = db.query(models.AISuggestion).filter(
                    models.AISuggestion.name == name,
                    models.AISuggestion.status == "pending"
                ).first()
                if is_dup or existing_sug:
                    continue
            
            if sug_type == "update" and db_exam:
                if name == db_exam.name and sug.get("last_date") == db_exam.last_date:
                    continue
                existing_sug = db.query(models.AISuggestion).filter(
                    models.AISuggestion.exam_id == db_exam.id,
                    models.AISuggestion.status == "pending"
                ).first()
                if existing_sug:
                    continue

            if sug_type == "expired" and db_exam:
                existing_sug = db.query(models.AISuggestion).filter(
                    models.AISuggestion.exam_id == db_exam.id,
                    models.AISuggestion.status == "pending",
                    models.AISuggestion.type == "expired"
                ).first()
                if existing_sug:
                    continue

            # Auto-publish rules: official_source is True AND confidence_score >= 95
            should_auto_publish = is_official and confidence >= 95

            if should_auto_publish:
                # Direct Database Publish / Update
                if sug_type == "new":
                    slug_candidate = re.sub(r"[^\w\s-]", "", name.lower().strip())
                    slug_candidate = re.sub(r"[\s_-]+", "-", slug_candidate)
                    
                    new_exam = models.Exam(
                        name=name,
                        conducting_org=conducting_org,
                        description=sug.get("description"),
                        level=sug.get("level") or "12th",
                        eligibility=sug.get("eligibility"),
                        application_start_date=sug.get("application_start_date"),
                        last_date=sug.get("last_date"),
                        exam_date=sug.get("exam_date"),
                        application_fee=sug.get("application_fee"),
                        mode=sug.get("mode"),
                        category=sug.get("category") or "Government Exams",
                        official_link=official_link,
                        syllabus_link=sug.get("syllabus_link"),
                        papers_link=sug.get("papers_link"),
                        notification_pdf=sug.get("notification_pdf"),
                        slug=slug_candidate,
                        status="Application Open" if sug.get("application_start_date") else "Upcoming"
                    )
                    db.add(new_exam)
                    db.flush()
                    cls.archive_previous_year_versions(db, name, conducting_org)
                    
                    # Create approved suggestion log
                    db_sug = models.AISuggestion(
                        type=sug_type,
                        exam_id=new_exam.id,
                        name=name,
                        conducting_org=conducting_org,
                        status="approved",
                        confidence_score=confidence,
                        confidence_reason=reason,
                        detected_date=datetime.utcnow().strftime("%Y-%m-%d")
                    )
                    db.add(db_sug)
                    
                    log_activity("suggestion_approved", f"Auto-published new exam '{name}' (Exam ID: {new_exam.id})")
                    notify_matching_students(db, new_exam, is_new=True)
                    auto_published_count += 1

                elif sug_type == "update" and db_exam:
                    # Change History (6. Change History)
                    backup_data = {
                        "changed_by": "Mani AI Agent",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "old_data": {
                            "name": db_exam.name,
                            "conducting_org": db_exam.conducting_org,
                            "description": db_exam.description,
                            "level": db_exam.level,
                            "eligibility": db_exam.eligibility,
                            "application_start_date": db_exam.application_start_date,
                            "last_date": db_exam.last_date,
                            "exam_date": db_exam.exam_date,
                            "application_fee": db_exam.application_fee,
                            "mode": db_exam.mode,
                            "category": db_exam.category,
                            "official_link": db_exam.official_link,
                            "syllabus_link": db_exam.syllabus_link,
                            "papers_link": db_exam.papers_link,
                            "notification_pdf": db_exam.notification_pdf
                        },
                        "new_data": {
                            "name": name,
                            "description": sug.get("description"),
                            "level": sug.get("level"),
                            "eligibility": sug.get("eligibility"),
                            "application_start_date": sug.get("application_start_date"),
                            "last_date": sug.get("last_date"),
                            "exam_date": sug.get("exam_date"),
                            "application_fee": sug.get("application_fee"),
                            "mode": sug.get("mode"),
                            "category": sug.get("category"),
                            "official_link": official_link,
                            "syllabus_link": sug.get("syllabus_link"),
                            "papers_link": sug.get("papers_link"),
                            "notification_pdf": sug.get("notification_pdf")
                        }
                    }
                    
                    # Update fields
                    db_exam.name = name
                    db_exam.description = sug.get("description") or db_exam.description
                    db_exam.level = sug.get("level") or db_exam.level
                    db_exam.eligibility = sug.get("eligibility") or db_exam.eligibility
                    db_exam.application_start_date = sug.get("application_start_date") or db_exam.application_start_date
                    db_exam.last_date = sug.get("last_date") or db_exam.last_date
                    db_exam.exam_date = sug.get("exam_date") or db_exam.exam_date
                    db_exam.application_fee = sug.get("application_fee") or db_exam.application_fee
                    db_exam.mode = sug.get("mode") or db_exam.mode
                    db_exam.category = sug.get("category") or db_exam.category
                    db_exam.official_link = official_link or db_exam.official_link
                    db_exam.syllabus_link = sug.get("syllabus_link") or db_exam.syllabus_link
                    db_exam.papers_link = sug.get("papers_link") or db_exam.papers_link
                    db_exam.notification_pdf = sug.get("notification_pdf") or db_exam.notification_pdf
                    
                    db_sug = models.AISuggestion(
                        type=sug_type,
                        exam_id=db_exam.id,
                        name=name,
                        conducting_org=conducting_org,
                        backup_data=json.dumps(backup_data),
                        status="approved",
                        confidence_score=confidence,
                        confidence_reason=reason,
                        detected_date=datetime.utcnow().strftime("%Y-%m-%d")
                    )
                    db.add(db_sug)
                    
                    log_activity("suggestion_approved", f"Auto-updated exam '{db_exam.name}' (Exam ID: {db_exam.id})")
                    notify_matching_students(db, db_exam, is_new=False)
                    auto_published_count += 1
            else:
                # Save suggestion as pending for AI Review Queue
                db_suggestion = models.AISuggestion(
                    type=sug_type,
                    exam_id=db_exam.id if db_exam else None,
                    name=name,
                    conducting_org=conducting_org,
                    description=sug.get("description"),
                    level=sug.get("level"),
                    eligibility=sug.get("eligibility"),
                    application_start_date=sug.get("application_start_date"),
                    last_date=sug.get("last_date"),
                    exam_date=sug.get("exam_date"),
                    application_fee=sug.get("application_fee"),
                    mode=sug.get("mode"),
                    category=sug.get("category"),
                    official_link=official_link,
                    syllabus_link=sug.get("syllabus_link"),
                    papers_link=sug.get("papers_link"),
                    notification_pdf=sug.get("notification_pdf"),
                    source_url=sug.get("source_url"),
                    source_name=sug.get("source_name"),
                    detected_date=datetime.utcnow().strftime("%Y-%m-%d"),
                    confidence_score=confidence,
                    confidence_reason=reason,
                    status="pending"
                )
                db.add(db_suggestion)
                new_suggestions_count += 1

        db.commit()
        return new_suggestions_count
