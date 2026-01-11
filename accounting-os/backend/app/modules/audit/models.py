from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class AuditLog(Base):
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False) # e.g., "CREATE_VOUCHER", "LOGIN"
    resource = Column(String, nullable=False) # e.g., "Voucher", "User"
    resource_id = Column(String, nullable=True)
    
    user_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    user = relationship("app.modules.auth.models.User")
    
    details = Column(Text, nullable=True) # JSON string of changes or useful info
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
