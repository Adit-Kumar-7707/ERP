from sqlalchemy.orm import Session
from app.modules.audit.models import AuditLog, VoucherVersion
from datetime import datetime
from fastapi.encoders import jsonable_encoder

def log_audit(
    db: Session, 
    user_id: int, 
    action: str, 
    entity_type: str, 
    entity_id: str, 
    before: dict = None, 
    after: dict = None,
    ip_address: str = None
):
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        user_id=user_id,
        before_state=before,
        after_state=after,
        ip_address=ip_address
    )
    db.add(log)
    # db.commit() # Caller commits usually? Or we commit to ensure log is safe even if txn fails? 
    # Better to participate in TXN for Atomic Consistency. 
    # But for "Security Log", sometimes we want logs even on failure?
    # For now, standard TXN participation.

def create_voucher_snapshot(db: Session, voucher, user_id: int):
    """
    Snapshots the CURRENT state of a voucher before specific changes.
    """
    # 1. Determine next version number
    # count existing versions
    count = db.query(VoucherVersion).filter(VoucherVersion.voucher_id == voucher.id).count()
    version_num = count + 1
    
    # 2. Serialize Voucher
    # Using jsonable_encoder or Pydantic 'model_dump' if available on ORM? ORM -> Pydantic -> Dict
    # Or strict manual dump
    snapshot = jsonable_encoder(voucher) 
    # Note: jsonable_encoder deals with circular refs cleanly usually, or we need schemas.
    # Assuming voucher is ORM object, encoder works but might be heavy.
    
    vv = VoucherVersion(
        voucher_id=voucher.id,
        version_number=version_num,
        snapshot_json=snapshot,
        created_by_id=user_id
    )
    db.add(vv)
