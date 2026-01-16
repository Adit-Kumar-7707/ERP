from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class BankEntry(BaseModel):
    id: int
    voucher_date: date
    voucher_number: str
    voucher_type: str
    particulars: str # The OPPOSITE ledger name (Party)
    instrument_number: Optional[str] = None
    instrument_date: Optional[date] = None
    bank_date: Optional[date] = None
    debit: float
    credit: float
    
    class Config:
        from_attributes = True

class ReconcileRequest(BaseModel):
    entry_id: int
    bank_date: date
