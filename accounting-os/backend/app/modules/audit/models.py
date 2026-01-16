from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class AuditLog(Base):
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False) # e.g., "CREATE", "UPDATE", "DELETE", "APPROVE"
    entity_type = Column(String, nullable=False, index=True) # e.g., "Voucher", "User"
    entity_id = Column(String, nullable=True, index=True) # String to handle mixed IDs? Usually Integer. Let's keep String for flexibility.
    
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True, index=True)
    user = relationship("app.modules.auth.models.User")
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    ip_address = Column(String, nullable=True)
    
    # Payload
    before_state = Column(JSON, nullable=True)
    after_state = Column(JSON, nullable=True)

class VoucherVersion(Base):
    """
    Stores snapshots of Vouchers before edits.
    """
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("voucherentry.id"), nullable=False)
    version_number = Column(Integer, nullable=False)
    
    snapshot_json = Column(JSON, nullable=False) # Full Dump of Voucher + Lines
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    
    voucher = relationship("app.modules.vouchers.models.VoucherEntry")
    created_by = relationship("app.modules.auth.models.User")
