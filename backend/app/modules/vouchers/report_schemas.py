from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class VoucherEntrySchema(BaseModel):
    id: int
    ledger_id: int
    ledger_name: Optional[str] = None
    amount: float
    is_debit: bool
    stock_item_id: Optional[int]
    stock_item_name: Optional[str] = None
    quantity: float
    rate: float
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None

    class Config:
        from_attributes = True

class VoucherSchema(BaseModel):
    id: int
    date: date
    voucher_number: str
    voucher_type_name: str
    narration: Optional[str]
    entries: List[VoucherEntrySchema]

    class Config:
        from_attributes = True
    class Config:
        from_attributes = True

class VoucherDetailSchema(BaseModel):
    id: int
    voucher_type_id: int
    date: date
    voucher_number: str
    narration: Optional[str]
    entries: List[VoucherEntrySchema]

    class Config:
        from_attributes = True
