from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.modules.auth import deps
from app.modules.jobs import service, models

router = APIRouter()

@router.post("/", response_model=dict)
def create_job(
    type: str,
    params: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    """
    Create a new background job.
    """
    job = service.create_job(db, type, params, background_tasks)
    return {"id": job.id, "status": job.status, "message": "Job queued"}

@router.get("/{job_id}", response_model=dict)
def get_job_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    job = db.query(models.Job).filter(models.Job.id == job_id).first()
    if not job:
        return {"error": "Job not found"}
        
    return {
        "id": job.id,
        "type": job.type,
        "status": job.status,
        "progress": job.progress,
        "result": job.result,
        "error": job.error_message,
        "created_at": job.created_at,
        "completed_at": job.completed_at
    }
