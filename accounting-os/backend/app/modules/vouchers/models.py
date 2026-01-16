from sqlalchemy import Column, Integer, String, Boolean, JSON, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum

class VoucherSequenceType(str, enum.Enum):
    AUTOMATIC = "automatic"
    MANUAL = "manual"

class VoucherStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    CANCELLED = "cancelled"

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
    
    # Real Voucher Fields (Part 2)
    party_ledger_id = Column(Integer, ForeignKey('account.id'), nullable=True) # For Sales/Purchase
    status = Column(String, default=VoucherStatus.DRAFT) 
    
    # Cached Totals
    net_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    
    # Link to core accounting (The "Effect")
    journal_entry_id = Column(Integer, ForeignKey('journalentry.id'), nullable=True)
    
    voucher_type = relationship("VoucherType")
    journal_entry = relationship("app.modules.accounting.models.JournalEntry")
    party_ledger = relationship("app.modules.accounting.models.Account", foreign_keys=[party_ledger_id])
    
    # Relations for Lines and Charges
    items = relationship("VoucherLineItem", back_populates="voucher", cascade="all, delete-orphan")
    charges = relationship("VoucherCharge", back_populates="voucher", cascade="all, delete-orphan")

class VoucherLineItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey('voucherentry.id'), nullable=False)
    
    # Core linkage
    ledger_id = Column(Integer, ForeignKey('account.id'), nullable=True) # Sales/Purchase Ledger
    item_id = Column(Integer, ForeignKey('stockitem.id'), nullable=True) # Stock Item (Optional)
    
    description = Column(String, nullable=True)
    qty = Column(Float, default=0.0)
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0) # qty * rate
    discount_amount = Column(Float, default=0.0)
    
    voucher = relationship("VoucherEntry", back_populates="items")
    ledger = relationship("app.modules.accounting.models.Account")
    item = relationship("app.modules.inventory.models.StockItem")

class VoucherCharge(Base):
    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey('voucherentry.id'), nullable=False)
    
    ledger_id = Column(Integer, ForeignKey('account.id'), nullable=False) # Charge Ledger (Freight, Discount)
    amount = Column(Float, default=0.0) # Can be negative for discount
    charge_type = Column(String, nullable=True) # "fixed", "percent" (Metadata)
    
    voucher = relationship("VoucherEntry", back_populates="charges")
    ledger = relationship("app.modules.accounting.models.Account")
