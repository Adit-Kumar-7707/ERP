from sqlalchemy import Column, Integer, String, Enum, Date, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import relationship, backref
import enum
from app.db.base import Base

class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    INCOME = "income"
    EXPENSE = "expense"

class Account(Base):
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # stored as string for simplicity, validated by schema
    description = Column(String, nullable=True)
    
    # Hierarchy
    parent_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    children = relationship("Account", 
                backref=backref('parent', remote_side=[id]),
                cascade="all, delete-orphan")
    is_group = Column(Integer, default=False) 
    
    # GST / Compliance
    gst_number = Column(String, nullable=True)
    state_code = Column(String, nullable=True)
    is_registered = Column(Boolean, default=False)
    
    # Safety
    is_deleted = Column(Boolean, default=False)

class FinancialYear(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # e.g. "FY 2024-25"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    is_closed = Column(Boolean, default=False)
    
    # Locking
    is_locked = Column(Boolean, default=False) # Global lock
    locked_upto = Column(Date, nullable=True) # Lock entries before this date

class JournalEntry(Base):
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    voucher_type = Column(String, nullable=False) # Sales, Purchase, Payment, Receipt, Journal, Contra
    reference = Column(String, nullable=True)
    narration = Column(Text, nullable=True)
    
    # Part 1: Hardening Fields
    financial_year_id = Column(Integer, ForeignKey('financialyear.id'), nullable=True, index=True) # Nullable for migration/old data, but logic should enforce
    is_opening = Column(Boolean, default=False)
    is_system_entry = Column(Boolean, default=False) # Computed entries (Closing, Depreciation)
    is_locked = Column(Boolean, default=False) # Individual lock
    
    financial_year = relationship("FinancialYear")
    lines = relationship("JournalLine", back_populates="entry", cascade="all, delete-orphan")

class JournalLine(Base):
    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("journalentry.id"), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("account.id"), nullable=False, index=True)
    description = Column(String, nullable=True)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("app.modules.accounting.models.Account")
