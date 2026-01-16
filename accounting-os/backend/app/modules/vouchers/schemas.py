from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from app.modules.accounting.schemas import JournalLineCreate

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
    status: str = "draft"
    party_ledger_id: Optional[int] = None
    narration: Optional[str] = None
    date: str # ISO Date

# Real Voucher Sub-models
class VoucherItemCreate(BaseModel):
    ledger_id: Optional[int] = None # Sales/Purchase Ledger
    item_id: Optional[int] = None # Stock Item
    description: Optional[str] = None
    qty: float = 0.0
    rate: float = 0.0
    amount: float = 0.0
    discount_amount: float = 0.0

class VoucherChargeCreate(BaseModel):
    ledger_id: int
    amount: float
    charge_type: Optional[str] = None

class VoucherEntryCreate(VoucherEntryBase):
    # Backward Compatibility: For "Journal" or manual entries
    lines: Optional[List[JournalLineCreate]] = None
    
    # Real Voucher Structure
    items: Optional[List[VoucherItemCreate]] = None
    charges: Optional[List[VoucherChargeCreate]] = None

class VoucherLineItem(VoucherItemCreate):
    id: int
    voucher_id: int

    class Config:
        from_attributes = True

class VoucherCharge(VoucherChargeCreate):
    id: int
    voucher_id: int

    class Config:
        from_attributes = True

class VoucherEntry(VoucherEntryBase):
    id: int
    journal_entry_id: Optional[int] = None
    
    net_amount: float = 0.0
    tax_amount: float = 0.0
    total_amount: float = 0.0

    items: List[VoucherLineItem] = []
    charges: List[VoucherCharge] = []

    class Config:
        from_attributes = True
