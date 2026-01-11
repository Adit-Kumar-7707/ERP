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
    is_group = Column(Integer, default=False) # Using Integer as Boolean (0/1) for SQLite compatibility if needed, or just Boolean is fine in SQLAlchemy (maps to 0/1 in SQLite)

class JournalEntry(Base):
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    voucher_type = Column(String, nullable=False) # Sales, Purchase, Payment, Receipt, Journal, Contra
    reference = Column(String, nullable=True)
    narration = Column(Text, nullable=True)
    
    lines = relationship("JournalLine", back_populates="entry", cascade="all, delete-orphan")

class JournalLine(Base):
    id = Column(Integer, primary_key=True, index=True)
    entry_id = Column(Integer, ForeignKey("journalentry.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("account.id"), nullable=False)
    description = Column(String, nullable=True)
    debit = Column(Float, default=0.0)
    credit = Column(Float, default=0.0)
    
    entry = relationship("JournalEntry", back_populates="lines")
    account = relationship("app.modules.accounting.models.Account")
