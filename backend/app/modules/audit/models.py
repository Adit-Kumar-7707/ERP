from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, index=True) # Voucher, Ledger, Item
    entity_id = Column(Integer, index=True)
    action = Column(String) # CREATE, UPDATE, DELETE, CANCEL
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Store snapshot or diff
    # For Edit Log compliance, we need the VERSION of the voucher at that time (Snapshot).
    details = Column(JSON, nullable=True) 
    
    user = relationship("User")
