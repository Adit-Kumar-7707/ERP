from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class VoucherSequenceType(str, enum.Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"

class VoucherType(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # e.g. "Sales", "Payment"
    type_group = Column(String, nullable=False) # e.g. "Sales", "Purchase", "Receipt", "Payment", "Journal", "Contra"
    
    # Configuration
    sequence_type = Column(String, default=VoucherSequenceType.AUTOMATIC)
    prefix = Column(String, nullable=True) # e.g. "INV-"
    current_sequence = Column(Integer, default=1)
    
    # Dynamic Field Config (stored as JSON)
    # Example: {"cheque_details": true, "cost_center": false}
    settings = Column(JSON, default={})
    
    # Default Accounts (for auto-population)
    default_debit_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    default_credit_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)

class VoucherEntry(Base):
    """
    Acts as a header for the Journal Entry, but specific to the Voucher System.
    Links to the core JournalEntry for accounting impact.
    """
    id = Column(Integer, primary_key=True, index=True)
    voucher_number = Column(String, unique=True, index=True, nullable=False) # e.g. "INV-001"
    voucher_type_id = Column(Integer, ForeignKey('vouchertype.id'), nullable=False)
    
    # Link to core accounting (The "Effect")
    journal_entry_id = Column(Integer, ForeignKey('journalentry.id'), nullable=True)
    
    voucher_type = relationship("VoucherType")
    journal_entry = relationship("app.modules.accounting.models.JournalEntry")
