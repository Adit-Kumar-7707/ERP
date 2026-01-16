from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float
from sqlalchemy.sql import func
from app.db.base import Base
import enum

class JobType(str, enum.Enum):
    IMPORT = "IMPORT"
    REPORT = "REPORT"
    CLOSING = "CLOSING"

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Job(Base):
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False, index=True) # JobType
    status = Column(String, default=JobStatus.PENDING, index=True)
    progress = Column(Float, default=0.0)
    result = Column(JSON, nullable=True) # Result data or error details
    params = Column(JSON, nullable=True) # Input parameters
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_message = Column(Text, nullable=True)
