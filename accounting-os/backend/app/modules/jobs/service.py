from sqlalchemy.orm import Session
from app.modules.jobs.models import Job, JobStatus, JobType
from fastapi import BackgroundTasks
from datetime import datetime
import json
import time

# Registry of task handlers
TASK_HANDLERS = {}

def register_handler(job_type: str):
    def decorator(func):
        TASK_HANDLERS[job_type] = func
        return func
    return decorator

def create_job(db: Session, job_type: str, params: dict, background_tasks: BackgroundTasks):
    """
    Creates a job record and queues it in BackgroundTasks.
    """
    job = Job(type=job_type, params=params, status=JobStatus.PENDING)
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Queue the worker
    background_tasks.add_task(process_job_worker, job.id)
    
    return job

def process_job_worker(job_id: int):
    """
    Worker function to execute the job.
    Uses its own DB session (Dependency injection tricky here, so we create manual session).
    """
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return
            
        job.status = JobStatus.RUNNING
        db.commit()
        
        handler = TASK_HANDLERS.get(job.type)
        if not handler:
            raise Exception(f"No handler for job type {job.type}")
            
        # Execute Handler
        result = handler(db, job)
        
        job.result = result
        job.status = JobStatus.COMPLETED
        job.progress = 100.0
        job.completed_at = datetime.now()
        db.commit()
        
    except Exception as e:
        db.rollback()
        # Refresh to ensure we have latest object attached
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now()
            db.commit()
    finally:
        db.close()

# Example Handler Registration
@register_handler(JobType.REPORT)
def handle_report_generation(db: Session, job: Job):
    # Simulate heavy work
    import time
    time.sleep(1) # checking worker
    return {"report_url": "generated_report.pdf"}
