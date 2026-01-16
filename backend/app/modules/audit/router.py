from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.db import get_db
from .models import AuditLog
from app.modules.auth.models import User

router = APIRouter(
    prefix="/audit",
    tags=["Audit"]
)

class AuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    timestamp: datetime
    user_name: Optional[str]
    details: Optional[dict]
    
    class Config:
        from_attributes = True

@router.get("/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    entity_type: str = Query(...),
    entity_id: int = Query(...),
    db: Session = Depends(get_db)
):
    logs = db.query(AuditLog).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id
    ).order_by(AuditLog.timestamp.desc()).all()
    
    res = []
    for l in logs:
        res.append(AuditLogResponse(
            id=l.id,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            action=l.action,
            timestamp=l.timestamp,
            user_name=l.user.username if l.user else "System",
            details=l.details
        ))
    return res
