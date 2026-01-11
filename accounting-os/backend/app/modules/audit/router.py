from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db, get_current_active_user
from .models import AuditLog
from typing import List, Any
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class AuditLogSchema(BaseModel):
    id: int
    action: str
    resource: str
    resource_id: str = None
    user_email: str = None
    timestamp: datetime
    details: str = None
    ip_address: str = None

    class Config:
        orm_mode = True

@router.get("/", response_model=List[AuditLogSchema])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    # Join with User to get email if needed, or loop.
    # Simple query
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Map to schema manually or let Pydantic extract if User relationship is loaded
    results = []
    for log in logs:
        # Avoid N+1 if lazy loading, but for MVP strict strict latency not critical
        # Ideally eager load user
        results.append(AuditLogSchema(
            id=log.id,
            action=log.action,
            resource=log.resource,
            resource_id=log.resource_id or "",
            user_email=log.user.email if log.user else "System",
            timestamp=log.timestamp,
            details=log.details,
            ip_address=log.ip_address
        ))
    return results

# Helper to capture audit log (to be used by other modules)
def create_audit_log(db: Session, action: str, resource: str, resource_id: str, user_id: int, details: str = None, ip: str = None):
    log = AuditLog(
        action=action,
        resource=resource,
        resource_id=resource_id,
        user_id=user_id,
        details=details,
        ip_address=ip
    )
    db.add(log)
    db.commit()
