from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import json
import io
import re
import shutil
import time
import os

from ..database import get_db
from .. import schemas, models, crud
from .auth import get_current_user, get_current_admin, log_admin_activity

router = APIRouter(prefix="/exams", tags=["Exams"])

def parse_uploaded_file(file: UploadFile):
    filename = file.filename.lower()
    content = file.file.read()
    
    exams = []
    errors = []
    
    if filename.endswith('.json'):
        try:
            data = json.loads(content.decode('utf-8'))
            if isinstance(data, dict):
                if "exams" in data and isinstance(data["exams"], list):
                    exams = data["exams"]
                else:
                    exams = [data]
            elif isinstance(data, list):
                exams = data
            else:
                errors.append({"error": "Invalid JSON format. Expected list or object."})
        except Exception as e:
            errors.append({"error": f"JSON parsing failed: {str(e)}"})
            
    elif filename.endswith('.csv'):
        try:
            text_data = content.decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(text_data))
            for row in reader:
                exams.append(dict(row))
        except Exception as e:
            errors.append({"error": f"CSV parsing failed: {str(e)}"})
            
    elif filename.endswith(('.xlsx', '.xls')):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
            sheet = wb.active
            headers = []
            for row_idx, row in enumerate(sheet.iter_rows(values_only=True)):
                if row_idx == 0:
                    headers = [str(cell).strip() if cell is not None else f"column_{i}" for i, cell in enumerate(row)]
                else:
                    if not any(cell is not None for cell in row):
                        continue
                    row_dict = {}
                    for col_idx, cell in enumerate(row):
                        if col_idx < len(headers):
                            row_dict[headers[col_idx]] = cell
                    exams.append(row_dict)
        except Exception as e:
            errors.append({"error": f"Excel parsing failed: {str(e)}"})
    else:
        errors.append({"error": f"Unsupported file extension: {filename}"})
        
    return exams, errors

def normalize_and_validate_exam(raw_exam: dict, db_session, index: int):
    key_mapping = {
        "exam_name": "name",
        "name": "name",
        "conducting_organization": "conducting_org",
        "conducting_org": "conducting_org",
        "full_form": "full_form",
        "category": "category",
        "education_level": "level",
        "level": "level",
        "exam_level": "exam_level",
        "description": "description",
        "eligibility": "eligibility",
        "age_limit": "age_limit",
        "application_start_date": "application_start_date",
        "application_last_date": "last_date",
        "last_date": "last_date",
        "exam_date": "exam_date",
        "frequency": "frequency",
        "application_fee": "application_fee",
        "fees": "application_fee",
        "application_mode": "mode",
        "mode": "mode",
        "official_link": "official_link",
        "official links": "official_link",
        "official_links": "official_link",
        "syllabus_link": "syllabus_link",
        "syllabus": "syllabus",
        "papers_link": "papers_link",
        "notification_pdf": "notification_pdf",
        "status": "status",
        "state": "state",
        "difficulty_level": "difficulty_level",
        "difficulty": "difficulty_level",
        "recommended_for": "recommended_for",
        "career_outcome": "career_outcome",
        "source_verified": "source_verified",
        "data_source": "data_source",
        "last_verified_date": "last_verified_date",
        "next_verification_due": "next_verification_due",
        "slug": "slug",
        "tags": "tags",
        "keywords": "keywords",
    }
    
    normalized = {}
    for k, v in raw_exam.items():
        k_lower = str(k).lower().strip()
        if k_lower in key_mapping:
            normalized[key_mapping[k_lower]] = v
        else:
            normalized[k] = v

    errors = []
    
    name = normalized.get("name")
    if name:
        name = str(name).strip()
    if not name:
        errors.append("Exam Name is required.")
        
    conducting_org = normalized.get("conducting_org")
    if conducting_org:
        conducting_org = str(conducting_org).strip()
    if not conducting_org:
        errors.append("Conducting Organization is required.")
        
    category = normalized.get("category")
    if category:
        category = str(category).strip()
    if not category:
        errors.append("Category is required.")
        
    level = normalized.get("level")
    if level:
        level = str(level).strip()
    if not level:
        errors.append("Education Level is required.")

    if errors:
        return None, errors, False

    exam_dict = {
        "name": name,
        "conducting_org": conducting_org,
        "category": category,
        "level": level,
        "description": str(normalized.get("description")) if normalized.get("description") is not None else None,
        "eligibility": str(normalized.get("eligibility")) if normalized.get("eligibility") is not None else None,
        "application_start_date": str(normalized.get("application_start_date")) if normalized.get("application_start_date") is not None else None,
        "last_date": str(normalized.get("last_date")) if normalized.get("last_date") is not None else None,
        "exam_date": str(normalized.get("exam_date")) if normalized.get("exam_date") is not None else None,
        "application_fee": str(normalized.get("application_fee")) if normalized.get("application_fee") is not None else None,
        "mode": str(normalized.get("mode")) if normalized.get("mode") is not None else None,
        "official_link": str(normalized.get("official_link")) if normalized.get("official_link") is not None else None,
        "syllabus_link": str(normalized.get("syllabus_link")) if normalized.get("syllabus_link") is not None else None,
        "papers_link": str(normalized.get("papers_link")) if normalized.get("papers_link") is not None else None,
        "notification_pdf": str(normalized.get("notification_pdf")) if normalized.get("notification_pdf") is not None else None,
        
        "status": str(normalized.get("status", "Upcoming")) if normalized.get("status") is not None else "Upcoming",
        "state": str(normalized.get("state", "All India")) if normalized.get("state") is not None else "All India",
        "difficulty_level": str(normalized.get("difficulty_level", "Moderate")) if normalized.get("difficulty_level") is not None else "Moderate",
        "recommended_for": normalized.get("recommended_for", []),
        "career_outcome": str(normalized.get("career_outcome")) if normalized.get("career_outcome") is not None else None,
        "source_verified": bool(normalized.get("source_verified", False)),
        "data_source": str(normalized.get("data_source")) if normalized.get("data_source") is not None else None,
        "last_verified_date": str(normalized.get("last_verified_date")) if normalized.get("last_verified_date") is not None else None,
        "next_verification_due": str(normalized.get("next_verification_due")) if normalized.get("next_verification_due") is not None else None,
        
        "full_form": str(normalized.get("full_form")) if normalized.get("full_form") is not None else None,
        "exam_level": str(normalized.get("exam_level")) if normalized.get("exam_level") is not None else None,
        "age_limit": str(normalized.get("age_limit")) if normalized.get("age_limit") is not None else None,
        "frequency": str(normalized.get("frequency")) if normalized.get("frequency") is not None else None,
        "selection_process": str(normalized.get("selection_process")) if normalized.get("selection_process") is not None else None,
        "exam_pattern": str(normalized.get("exam_pattern")) if normalized.get("exam_pattern") is not None else None,
        "syllabus": str(normalized.get("syllabus")) if normalized.get("syllabus") is not None else None,
        "tags": normalized.get("tags", []),
        "keywords": normalized.get("keywords", []),
    }
    
    for list_field in ["recommended_for", "tags", "keywords"]:
        val = exam_dict[list_field]
        if isinstance(val, str):
            if val.startswith('[') and val.endswith(']'):
                try:
                    exam_dict[list_field] = json.loads(val)
                except:
                    exam_dict[list_field] = [x.strip() for x in val[1:-1].split(',')]
            else:
                exam_dict[list_field] = [x.strip() for x in val.split(',') if x.strip()]
        elif not isinstance(val, list):
            exam_dict[list_field] = []

    slug = normalized.get("slug")
    if slug:
        slug = str(slug).strip()
    if not slug:
        slug_candidate = re.sub(r"[^\w\s-]", "", name.lower().strip())
        slug = re.sub(r"[\s_-]+", "-", slug_candidate)
    exam_dict["slug"] = slug

    exam_dict["view_count"] = int(normalized.get("view_count", 0)) if normalized.get("view_count") is not None else 0
    exam_dict["apply_click_count"] = int(normalized.get("apply_click_count", 0)) if normalized.get("apply_click_count") is not None else 0
    exam_dict["bookmark_count"] = int(normalized.get("bookmark_count", 0)) if normalized.get("bookmark_count") is not None else 0

    # Calculate Data Quality Score
    q_score = 0
    if exam_dict.get("official_link"): q_score += 20
    if exam_dict.get("eligibility"): q_score += 20
    if exam_dict.get("application_start_date") or exam_dict.get("last_date"): q_score += 20
    if exam_dict.get("syllabus_link") or exam_dict.get("syllabus"): q_score += 20
    if exam_dict.get("source_verified"): q_score += 20
    exam_dict["data_quality_score"] = q_score

    existing = db_session.query(models.Exam).filter(
        models.Exam.name == name,
        models.Exam.conducting_org == conducting_org
    ).first()
    duplicate = (existing is not None)

    return exam_dict, [], duplicate

def backup_database():
    db_file = "./examhub.db"
    if os.path.exists(db_file):
        timestamp = int(time.time())
        backup_file = f"./examhub.db.backup_{timestamp}"
        shutil.copy2(db_file, backup_file)
        return backup_file
    return None

def slugify_and_make_unique(name: str, db: Session, exclude_id: int = None):
    base_slug = re.sub(r"[^\w\s-]", "", name.lower().strip())
    base_slug = re.sub(r"[\s_-]+", "-", base_slug)
    slug_candidate = base_slug
    counter = 1
    query = db.query(models.Exam).filter(models.Exam.slug == slug_candidate)
    if exclude_id is not None:
        query = query.filter(models.Exam.id != exclude_id)
    while query.first():
        slug_candidate = f"{base_slug}-{counter}"
        counter += 1
        query = db.query(models.Exam).filter(models.Exam.slug == slug_candidate)
        if exclude_id is not None:
            query = query.filter(models.Exam.id != exclude_id)
    return slug_candidate

@router.get("/", response_model=List[schemas.ExamResponse])
def read_exams(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search term for exam name, description, etc."),
    category: Optional[str] = Query(None, description="Filter by category"),
    level: Optional[str] = Query(None, description="Filter by educational level"),
    status: Optional[str] = Query(None, description="Filter by status"),
    state: Optional[str] = Query(None, description="Filter by state"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    source_verified: Optional[bool] = Query(None, description="Filter by verification status"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Exam)
    
    if search:
        query = query.filter(
            re.sub(r'\s+', '%', search).strip() != '' and (
                models.Exam.name.ilike(f"%{search}%") |
                models.Exam.conducting_org.ilike(f"%{search}%") |
                models.Exam.description.ilike(f"%{search}%") |
                models.Exam.eligibility.ilike(f"%{search}%") |
                models.Exam.category.ilike(f"%{search}%")
            )
        )
    if category:
        query = query.filter(models.Exam.category == category)
    if level:
        query = query.filter(models.Exam.level == level)
    if status:
        query = query.filter(models.Exam.status == status)
    if state:
        query = query.filter(models.Exam.state == state)
    if difficulty:
        query = query.filter(models.Exam.difficulty_level == difficulty)
    if source_verified is not None:
        query = query.filter(models.Exam.source_verified == source_verified)
        
    return query.offset(skip).limit(limit).all()

@router.get("/{exam_id}", response_model=schemas.ExamResponse)
def read_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = crud.get_exam(db, exam_id=exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.post("/", response_model=schemas.ExamResponse, status_code=status.HTTP_201_CREATED)
def create_new_exam(
    exam: schemas.ExamCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    db_exam = crud.get_exam_by_name(db, name=exam.name)
    if db_exam:
        raise HTTPException(status_code=400, detail="Exam with this name already exists")
    
    # Calculate Data Quality Score
    q_score = 0
    if exam.official_link: q_score += 20
    if exam.eligibility: q_score += 20
    if exam.application_start_date or exam.last_date: q_score += 20
    if exam.syllabus_link: q_score += 20
    if exam.source_verified: q_score += 20
    
    exam_data = exam.model_dump()
    exam_data["data_quality_score"] = q_score
    exam_data["slug"] = slugify_and_make_unique(exam.name, db)
    
    created_exam = models.Exam(**exam_data)
    db.add(created_exam)
    db.commit()
    db.refresh(created_exam)
    log_admin_activity(db, "Admin created exam", request, f"Created manual exam: {exam.name}")
    return created_exam

@router.put("/{exam_id}", response_model=schemas.ExamResponse)
def update_existing_exam(
    exam_id: int,
    exam_data: schemas.ExamCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    db_exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
        
    # Calculate Data Quality Score
    q_score = 0
    if exam_data.official_link: q_score += 20
    if exam_data.eligibility: q_score += 20
    if exam_data.application_start_date or exam_data.last_date: q_score += 20
    if exam_data.syllabus_link: q_score += 20
    if exam_data.source_verified: q_score += 20
    
    for key, value in exam_data.model_dump().items():
        setattr(db_exam, key, value)
        
    db_exam.data_quality_score = q_score
    if not db_exam.slug:
        db_exam.slug = slugify_and_make_unique(db_exam.name, db, db_exam.id)
        
    db.commit()
    db.refresh(db_exam)
    log_admin_activity(db, "Admin edited exam", request, f"Modified manual exam details for: {exam_data.name}")
    return db_exam

@router.delete("/{exam_id}", status_code=status.HTTP_200_OK)
def delete_existing_exam(
    exam_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    exam = crud.get_exam(db, exam_id)
    exam_name = exam.name if exam else f"ID {exam_id}"
    success = crud.delete_exam(db=db, exam_id=exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found")
    log_admin_activity(db, "Admin deleted exam", request, f"Deleted manual exam: {exam_name}")
    return {"detail": "Exam deleted successfully"}

@router.post("/{exam_id}/bookmark", status_code=status.HTTP_200_OK)
def toggle_exam_bookmark(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    status_msg = crud.toggle_bookmark(db=db, user_id=current_user.id, exam_id=exam_id)
    if status_msg is None:
        raise HTTPException(status_code=404, detail="Exam or User not found")
    return {"status": status_msg}

@router.post("/import/preview")
def import_exams_preview(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    raw_exams, parse_errors = parse_uploaded_file(file)
    
    preview_items = []
    total_found = len(raw_exams)
    valid_count = 0
    duplicate_count = 0
    error_count = len(parse_errors)
    error_rows_list = []
    
    for err in parse_errors:
        error_rows_list.append({
            "row_index": 0,
            "exam_name": "N/A",
            "conducting_org": "N/A",
            "errors": [err["error"]]
        })

    for idx, raw in enumerate(raw_exams, start=1):
        exam_dict, errors, duplicate = normalize_and_validate_exam(raw, db, idx)
        if errors:
            error_count += 1
            error_rows_list.append({
                "row_index": idx,
                "exam_name": raw.get("exam_name") or raw.get("name") or "N/A",
                "conducting_org": raw.get("conducting_organization") or raw.get("conducting_org") or "N/A",
                "errors": errors
            })
        else:
            if duplicate:
                duplicate_count += 1
            else:
                valid_count += 1
            preview_items.append({
                "row_index": idx,
                "is_duplicate": duplicate,
                "data": exam_dict
            })
            
    return {
        "total_exams_found": total_found,
        "valid_exams_count": valid_count,
        "duplicate_exams_count": duplicate_count,
        "error_rows_count": error_count,
        "preview_items": preview_items,
        "error_rows": error_rows_list
    }

@router.post("/import/confirm")
def import_exams_confirm(
    payload: schemas.ImportConfirmPayload,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin)
):
    exams = payload.exams
    duplicate_strategy = payload.duplicate_strategy
    
    total_to_import = len(exams)
    success_count = 0
    failed_count = 0
    failed_rows = []
    
    backup_file = None
    if total_to_import >= 100:
        backup_file = backup_database()
        
    for idx, exam_data in enumerate(exams):
        try:
            # Clean fields that might be lists but database requires JSON (SQLAlchemy will handle Python lists if types are JSON)
            # Find duplicate
            existing = db.query(models.Exam).filter(
                models.Exam.name == exam_data["name"],
                models.Exam.conducting_org == exam_data["conducting_org"]
            ).first()
            
            if existing:
                if duplicate_strategy == "skip":
                    # Ignore and count as skipped (neither success nor fail)
                    continue
                elif duplicate_strategy == "update":
                    for key, val in exam_data.items():
                        if key not in ["id", "slug", "view_count", "apply_click_count", "bookmark_count"]:
                            setattr(existing, key, val)
                    if not existing.slug:
                        existing.slug = slugify_and_make_unique(existing.name, db, existing.id)
                    db.commit()
                    success_count += 1
                    continue
                elif duplicate_strategy == "create_new_version":
                    version_counter = 2
                    candidate_name = f"{exam_data['name']} (v{version_counter})"
                    while db.query(models.Exam).filter(models.Exam.name == candidate_name).first():
                        version_counter += 1
                        candidate_name = f"{exam_data['name']} (v{version_counter})"
                    exam_data["name"] = candidate_name
            
            exam_data["slug"] = slugify_and_make_unique(exam_data["name"], db)
            
            db_exam = models.Exam(**exam_data)
            db.add(db_exam)
            db.commit()
            success_count += 1
        except Exception as e:
            db.rollback()
            failed_count += 1
            failed_rows.append({
                "row_index": exam_data.get("row_index", idx + 1),
                "exam_name": exam_data.get("name", "N/A"),
                "conducting_org": exam_data.get("conducting_org", "N/A"),
                "error": str(e)
            })
            
    log_msg = f"Bulk imported {total_to_import} exams. Success: {success_count}, Failed: {failed_count}."
    if backup_file:
        log_msg += f" Backup checkpoint: {backup_file}."
    log_admin_activity(db, "Admin bulk import", request, log_msg)
    
    return {
        "success_count": success_count,
        "failed_count": failed_count,
        "failed_rows": failed_rows,
        "backup_checkpoint": backup_file
    }
