from typing import Optional, Dict, Any
from pydantic import BaseModel

class VoucherTypeBase(BaseModel):
    name: str
    type_group: str
    sequence_type: str = "automatic"
    prefix: Optional[str] = None
    settings: Dict[str, Any] = {}
    default_debit_account_id: Optional[int] = None
    default_credit_account_id: Optional[int] = None

class VoucherTypeCreate(VoucherTypeBase):
    pass

class VoucherType(VoucherTypeBase):
    id: int
    current_sequence: int

    class Config:
        from_attributes = True

class VoucherEntryBase(BaseModel):
    voucher_type_id: int
    voucher_number: Optional[str] = None # Optional if auto-generated

from app.modules.accounting.schemas import JournalLineCreate

class VoucherEntryCreate(VoucherEntryBase):
    date: str # ISO Date
    narration: Optional[str] = None
    lines: list[JournalLineCreate]

class VoucherEntry(VoucherEntryBase):
    id: int
    date: Optional[str] = None # For response
    narration: Optional[str] = None
    journal_entry_id: Optional[int] = None

    class Config:
        from_attributes = True
