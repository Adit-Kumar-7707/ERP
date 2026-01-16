from typing import List, Optional
from datetime import date
from pydantic import BaseModel, validator
from app.modules.accounting.models import AccountType

# Account Schemas
class AccountBase(BaseModel):
    code: str
    name: str
    type: AccountType
    description: Optional[str] = None
    parent_id: Optional[int] = None
    is_group: bool = False

class AccountCreate(AccountBase):
    pass

class Account(AccountBase):
    id: int

    class Config:
        from_attributes = True

# Journal Schemas
class JournalLineBase(BaseModel):
    account_id: int
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None

class JournalLineCreate(JournalLineBase):
    pass

class JournalLine(JournalLineBase):
    id: int
    account: Optional[Account] = None

    class Config:
        from_attributes = True

class JournalEntryBase(BaseModel):
    date: date
    voucher_type: str
    reference: Optional[str] = None
    narration: Optional[str] = None
    financial_year_id: Optional[int] = None
    is_opening: bool = False

class JournalEntryCreate(JournalEntryBase):
    lines: List[JournalLineCreate]

    @validator('lines')
    def validate_balance(cls, v):
        total_debit = sum(line.debit for line in v)
        total_credit = sum(line.credit for line in v)
        if abs(total_debit - total_credit) > 0.01: # Allowing floating point tolerance
            raise ValueError(f'Total Debit ({total_debit}) must equal Total Credit ({total_credit})')
        return v

class JournalEntry(JournalEntryBase):
    id: int
    lines: List[JournalLine] = []
    is_system_entry: bool = False
    is_locked: bool = False

    class Config:
        from_attributes = True
