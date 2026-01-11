from sqlalchemy import Column, Integer, String, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class RuleEvent(str, enum.Enum):
    BEFORE_SAVE = "before_save"
    AFTER_SAVE = "after_save"
    ON_VALIDATE = "on_validate"

class RuleAction(str, enum.Enum):
    BLOCK = "block"
    WARN = "warn"
    AUTO_CORRECT = "auto_correct"

class Rule(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    
    # Trigger
    event = Column(String, nullable=False, default=RuleEvent.BEFORE_SAVE)
    target_voucher_type_id = Column(Integer, ForeignKey('vouchertype.id'), nullable=True) # Null = Global Rule
    
    # Logic
    # Simple Python-like expression: "entry.amount > 10000"
    condition = Column(Text, nullable=False) 
    
    # Outcome
    action = Column(String, default=RuleAction.BLOCK)
    message = Column(String, nullable=True) # Error message to show
    
    target_voucher_type = relationship("app.modules.vouchers.models.VoucherType")
