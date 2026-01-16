from sqlalchemy.orm import Session
from .models import AuditLog
from fastapi.encoders import jsonable_encoder

def log_change(db: Session, entity_type: str, entity_id: int, action: str, user_id: int = None, details: dict = None):
    # If details contain SQLAlchemy objects, encode them
    safe_details = jsonable_encoder(details) if details else {}
    
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user_id,
        details=safe_details
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
