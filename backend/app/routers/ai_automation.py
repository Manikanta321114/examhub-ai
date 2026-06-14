import json
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from .. import schemas, models
from ..routers.auth import get_current_admin, log_admin_activity
from ..ai_automation.scanner import AIScanner

router = APIRouter(prefix="/admin/ai-automation", tags=["AI Exam Automation"])

def create_activity_log(db: Session, action: str, details: str):
    log_entry = models.AIActivityLog(
        timestamp=datetime.utcnow().isoformat() + "Z",
        action=action,
        details=details
    )
    db.add(log_entry)
    db.commit()

@router.post("/scan", response_model=dict)
def trigger_scan(
    request: Request,
    mode: Optional[str] = "quick",
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    # 1. API Usage Protection (Rate limiting: max 5 scans per hour)
    one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
    recent_scans = db.query(models.AIActivityLog).filter(
        models.AIActivityLog.action == "scan_started",
        models.AIActivityLog.timestamp >= one_hour_ago
    ).count()
    
    if recent_scans >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Maximum 5 manual scans per hour."
        )

    try:
        create_activity_log(db, "scan_started", f"Scan ({mode}) initiated by administrator: {admin.email}")
        
        # Trigger scan with mode
        inserted_count = AIScanner.execute_scan(db, mode=mode)
        
        # Trigger expired check
        AIScanner.check_and_update_expired_exams(db)
        
        create_activity_log(db, "exams_found", f"Scan ({mode}) completed successfully. Found {inserted_count} pending suggestions.")
        log_admin_activity(db, "Admin triggered AI scan", request, f"Dispatched scan tool ({mode}), found {inserted_count} suggestions.")
        return {"status": "success", "suggestions_found": inserted_count}
    except Exception as e:
        error_msg = str(e)
        create_activity_log(db, "error", f"Scan execution failed: {error_msg}")
        # Error Handling: If Gemini fails, show clean user response
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI scan unavailable, retry later ({error_msg})"
        )

@router.get("/settings", response_model=dict)
def get_ai_settings(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    def get_setting_bool(key: str, default: bool) -> bool:
        s = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        return (s.value.lower() == "true") if s else default

    return {
        "daily_auto_scan": get_setting_bool("daily_auto_scan", False),
        "auto_discover_new_exams": get_setting_bool("auto_discover_new_exams", True),
        "auto_update_dates": get_setting_bool("auto_update_dates", True),
        "verify_official_links": get_setting_bool("verify_official_links", True),
        "update_status_lifecycle": get_setting_bool("update_status_lifecycle", True),
        "notify_students": get_setting_bool("notify_students", True),
        "track_results_admit_cards": get_setting_bool("track_results_admit_cards", True)
    }

@router.post("/settings", response_model=dict)
def update_ai_settings(
    payload: schemas.SystemSettingsUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    def set_setting_bool(key: str, value: Optional[bool]):
        if value is None:
            return
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        val_str = "true" if value else "false"
        if setting:
            setting.value = val_str
        else:
            setting = models.SystemSetting(key=key, value=val_str)
            db.add(setting)

    set_setting_bool("daily_auto_scan", payload.daily_auto_scan)
    set_setting_bool("auto_discover_new_exams", payload.auto_discover_new_exams)
    set_setting_bool("auto_update_dates", payload.auto_update_dates)
    set_setting_bool("verify_official_links", payload.verify_official_links)
    set_setting_bool("update_status_lifecycle", payload.update_status_lifecycle)
    set_setting_bool("notify_students", payload.notify_students)
    set_setting_bool("track_results_admit_cards", payload.track_results_admit_cards)
    
    db.commit()
    return {
        "status": "success",
        "daily_auto_scan": payload.daily_auto_scan,
        "auto_discover_new_exams": payload.auto_discover_new_exams,
        "auto_update_dates": payload.auto_update_dates,
        "verify_official_links": payload.verify_official_links,
        "update_status_lifecycle": payload.update_status_lifecycle,
        "notify_students": payload.notify_students,
        "track_results_admit_cards": payload.track_results_admit_cards
    }

@router.get("/analytics", response_model=dict)
def get_ai_analytics(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    # AI Scanned Today: scan log exists today
    scanned_today = db.query(models.AIActivityLog).filter(
        models.AIActivityLog.action == "scan_started",
        models.AIActivityLog.timestamp.like(f"{today_str}%")
    ).count() > 0

    last_scan = db.query(models.AIActivityLog).filter(
        models.AIActivityLog.action == "scan_started"
    ).order_by(models.AIActivityLog.id.desc()).first()
    last_scan_time = last_scan.timestamp if last_scan else None

    # Sources checked list
    sources_checked = ["UPSC", "SSC", "NTA", "Railway", "IBPS", "SBI", "Defence", "State PSCs"]

    # New exams added/auto-published today
    new_exams_added = db.query(models.AISuggestion).filter(
        models.AISuggestion.type == "new",
        models.AISuggestion.status == "approved",
        models.AISuggestion.detected_date == today_str
    ).count()

    # Updated exams today
    updated_exams = db.query(models.AISuggestion).filter(
        models.AISuggestion.type == "update",
        models.AISuggestion.status == "approved",
        models.AISuggestion.detected_date == today_str
    ).count()

    # Need review suggestions
    need_review = db.query(models.AISuggestion).filter(
        models.AISuggestion.status == "pending"
    ).count()

    return {
        "scanned_today": scanned_today,
        "last_scan_time": last_scan_time,
        "sources_checked": sources_checked,
        "new_exams_added": new_exams_added,
        "updated_exams": updated_exams,
        "need_review": need_review
    }

@router.get("/suggestions", response_model=List[schemas.AISuggestionResponse])
def get_ai_suggestions(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    query = db.query(models.AISuggestion)
    if status:
        query = query.filter(models.AISuggestion.status == status)
    return query.all()

@router.post("/suggestions/{suggestion_id}/approve", response_model=schemas.AISuggestionResponse)
def approve_ai_suggestion(
    suggestion_id: int,
    request: Request,
    payload: Optional[schemas.ExamCreate] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    sug = db.query(models.AISuggestion).filter(models.AISuggestion.id == suggestion_id).first()
    if not sug:
        raise HTTPException(status_code=404, detail="AI Suggestion not found")
    if sug.status != "pending":
        raise HTTPException(status_code=400, detail=f"Suggestion is already in '{sug.status}' status")

    try:
        source_data = payload if payload else sug
        if sug.type == "new":
            import re as regex
            slug_candidate = regex.sub(r"[^\w\s-]", "", source_data.name.lower().strip())
            slug_candidate = regex.sub(r"[\s_-]+", "-", slug_candidate)
            
            new_exam = models.Exam(
                name=source_data.name,
                conducting_org=source_data.conducting_org,
                description=source_data.description,
                level=source_data.level or "12th",
                eligibility=source_data.eligibility,
                application_start_date=source_data.application_start_date,
                last_date=source_data.last_date,
                exam_date=source_data.exam_date,
                application_fee=source_data.application_fee,
                mode=source_data.mode,
                category=source_data.category or "Government Exams",
                official_link=source_data.official_link,
                syllabus_link=source_data.syllabus_link,
                papers_link=source_data.papers_link,
                notification_pdf=source_data.notification_pdf,
                slug=slug_candidate,
                status="Application Open" if source_data.application_start_date else "Upcoming"
            )
            db.add(new_exam)
            db.flush()
            AIScanner.archive_previous_year_versions(db, source_data.name, source_data.conducting_org)
            sug.exam_id = new_exam.id
            
            # Update suggestion fields if admin edited it
            if payload:
                sug.name = payload.name
                sug.conducting_org = payload.conducting_org
                sug.description = payload.description
                sug.level = payload.level
                sug.eligibility = payload.eligibility
                sug.application_start_date = payload.application_start_date
                sug.last_date = payload.last_date
                sug.exam_date = payload.exam_date
                sug.application_fee = payload.application_fee
                sug.mode = payload.mode
                sug.category = payload.category
                sug.official_link = payload.official_link
                sug.syllabus_link = payload.syllabus_link
                sug.papers_link = payload.papers_link
                sug.notification_pdf = payload.notification_pdf
                
            create_activity_log(db, "suggestion_approved", f"Approved new exam '{sug.name}' (Exam ID: {new_exam.id})")
            log_admin_activity(db, "Admin approved AI suggestion", request, f"Approved new exam: {sug.name}")
            
            from ..ai_automation.scanner import notify_matching_students
            notify_matching_students(db, new_exam, is_new=True)

        elif sug.type == "update":
            exam = db.query(models.Exam).filter(models.Exam.id == sug.exam_id).first()
            if not exam:
                raise HTTPException(status_code=404, detail="Target exam not found to update")
            
            # Change History old vs new backup data (6. Change History)
            backup = {
                "changed_by": admin.email if admin else "Mani AI Agent",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "old_data": {
                    "name": exam.name,
                    "conducting_org": exam.conducting_org,
                    "description": exam.description,
                    "level": exam.level,
                    "eligibility": exam.eligibility,
                    "application_start_date": exam.application_start_date,
                    "last_date": exam.last_date,
                    "exam_date": exam.exam_date,
                    "application_fee": exam.application_fee,
                    "mode": exam.mode,
                    "category": exam.category,
                    "official_link": exam.official_link,
                    "syllabus_link": exam.syllabus_link,
                    "papers_link": exam.papers_link,
                    "notification_pdf": exam.notification_pdf
                },
                "new_data": {
                    "name": source_data.name,
                    "description": source_data.description,
                    "level": source_data.level,
                    "eligibility": source_data.eligibility,
                    "application_start_date": source_data.application_start_date,
                    "last_date": source_data.last_date,
                    "exam_date": source_data.exam_date,
                    "application_fee": source_data.application_fee,
                    "mode": source_data.mode,
                    "category": source_data.category,
                    "official_link": source_data.official_link,
                    "syllabus_link": source_data.syllabus_link,
                    "papers_link": source_data.papers_link,
                    "notification_pdf": source_data.notification_pdf
                }
            }
            sug.backup_data = json.dumps(backup)

            exam.name = source_data.name
            exam.conducting_org = source_data.conducting_org
            exam.description = source_data.description
            exam.level = source_data.level or exam.level
            exam.eligibility = source_data.eligibility
            exam.application_start_date = source_data.application_start_date
            exam.last_date = source_data.last_date
            exam.exam_date = source_data.exam_date
            exam.application_fee = source_data.application_fee
            exam.mode = source_data.mode
            exam.category = source_data.category or exam.category
            exam.official_link = source_data.official_link
            exam.syllabus_link = source_data.syllabus_link
            exam.papers_link = source_data.papers_link
            exam.notification_pdf = source_data.notification_pdf
            
            # Update suggestion fields if admin edited it
            if payload:
                sug.name = payload.name
                sug.conducting_org = payload.conducting_org
                sug.description = payload.description
                sug.level = payload.level
                sug.eligibility = payload.eligibility
                sug.application_start_date = payload.application_start_date
                sug.last_date = payload.last_date
                sug.exam_date = payload.exam_date
                sug.application_fee = payload.application_fee
                sug.mode = payload.mode
                sug.category = payload.category
                sug.official_link = payload.official_link
                sug.syllabus_link = payload.syllabus_link
                sug.papers_link = payload.papers_link
                sug.notification_pdf = payload.notification_pdf

            create_activity_log(db, "suggestion_approved", f"Approved update for '{exam.name}' (Exam ID: {exam.id})")
            log_admin_activity(db, "Admin approved AI suggestion", request, f"Updated exam info for: {exam.name}")

            from ..ai_automation.scanner import notify_matching_students
            notify_matching_students(db, exam, is_new=False)

        elif sug.type == "expired":
            exam = db.query(models.Exam).filter(models.Exam.id == sug.exam_id).first()
            if exam:
                exam.status = "Archived"
                create_activity_log(db, "suggestion_approved", f"Approved archival of expired exam '{sug.name}'")
                log_admin_activity(db, "Admin approved AI suggestion", request, f"Archived expired exam: {sug.name}")
            else:
                create_activity_log(db, "suggestion_approved", f"Archival approved, but exam '{sug.name}' was not found.")

        sug.status = "approved"
        db.commit()
        db.refresh(sug)
        return sug

    except Exception as e:
        db.rollback()
        create_activity_log(db, "error", f"Approval failed for suggestion {suggestion_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to approve suggestion: {str(e)}")

@router.post("/suggestions/{suggestion_id}/reject", response_model=schemas.AISuggestionResponse)
def reject_ai_suggestion(
    suggestion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    sug = db.query(models.AISuggestion).filter(models.AISuggestion.id == suggestion_id).first()
    if not sug:
        raise HTTPException(status_code=404, detail="AI Suggestion not found")
    if sug.status != "pending":
        raise HTTPException(status_code=400, detail=f"Suggestion is already in '{sug.status}' status")

    sug.status = "rejected"
    db.commit()
    db.refresh(sug)
    create_activity_log(db, "suggestion_rejected", f"Rejected AI suggestion for '{sug.name}' (Type: {sug.type})")
    log_admin_activity(db, "Admin rejected AI suggestion", request, f"Rejected AI suggestion: {sug.name}")
    return sug

@router.post("/suggestions/{suggestion_id}/rollback", response_model=schemas.AISuggestionResponse)
def rollback_ai_suggestion(
    suggestion_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    sug = db.query(models.AISuggestion).filter(models.AISuggestion.id == suggestion_id).first()
    if not sug:
        raise HTTPException(status_code=404, detail="AI Suggestion not found")
    if sug.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved suggestions can be rolled back")
    if sug.type != "update" or not sug.backup_data:
        raise HTTPException(status_code=400, detail="Rollback is only supported for update suggestions containing backup payloads")

    try:
        exam = db.query(models.Exam).filter(models.Exam.id == sug.exam_id).first()
        if not exam:
            exam = models.Exam(id=sug.exam_id)
            db.add(exam)
            
        backup = json.loads(sug.backup_data)
        # Handle backup payload formatting
        old_data = backup.get("old_data") if "old_data" in backup else backup
        
        for key, value in old_data.items():
            setattr(exam, key, value)
            
        sug.status = "restored"
        db.commit()
        db.refresh(sug)
        create_activity_log(db, "rollback_executed", f"Restored previous version of exam '{exam.name}' (Exam ID: {exam.id})")
        log_admin_activity(db, "Admin rolled back AI suggestion", request, f"Rolled back updates on: {exam.name}")
        return sug
    except Exception as e:
        db.rollback()
        create_activity_log(db, "error", f"Rollback failed for suggestion {suggestion_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to execute rollback: {str(e)}")

@router.get("/logs", response_model=List[schemas.AIActivityLogResponse])
def get_ai_logs(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    logs = db.query(models.AIActivityLog).order_by(models.AIActivityLog.id.desc()).all()
    return logs
