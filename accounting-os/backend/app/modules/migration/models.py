from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class ImportType(str, enum.Enum):
    EXCEL = "Excel"
    TALLY_XML = "TallyXML"

class ImportStatus(str, enum.Enum):
    PENDING = "Pending"
    SUCCESS = "Success"
    FAILED = "Failed"
    PARTIAL = "Partial" # Should not happen if transactional, but good to have

class ImportBatch(Base):
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default=ImportStatus.PENDING)
    record_count = Column(Integer, default=0)
    type = Column(String, nullable=False) # Excel / TallyXML
    
    imported_by_id = Column(Integer, ForeignKey("user.id"), nullable=True)
    imported_by = relationship("app.modules.auth.models.User")
    
    logs = relationship("ImportLog", back_populates="batch", cascade="all, delete-orphan")

class ImportLog(Base):
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("importbatch.id"), nullable=False)
    row_number = Column(Integer, nullable=True)
    status = Column(String, nullable=False) # Success / Failed
    error_message = Column(Text, nullable=True)
    raw_data = Column(JSON, nullable=True)
    
    batch = relationship("ImportBatch", back_populates="logs")
