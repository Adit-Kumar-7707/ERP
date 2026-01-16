from pydantic import BaseModel, root_validator
from typing import List, Optional
from datetime import date

class BillAllocationCreate(BaseModel):
    ref_type: str # New Ref, Agst Ref...
    ref_name: str
    amount: float
    credit_period: Optional[date] = None

class VoucherEntryCreate(BaseModel):
    ledger_id: int
    amount: float
    is_debit: bool
    
    # Inventory
    stock_item_id: Optional[int] = None
    quantity: float = 0.0
    rate: float = 0.0

    # Bill-wise Details
    bill_allocations: Optional[List[BillAllocationCreate]] = None

    @root_validator(skip_on_failure=True)
    def check_amount_calculation(cls, values):
        qty = values.get('quantity', 0)
        rate = values.get('rate', 0)
        amount = values.get('amount', 0)
        
        if qty and rate:
            calc = qty * rate
            if abs(calc - amount) > 0.1: # Tolerance
                 pass
        return values

class VoucherCreate(BaseModel):
    voucher_type_id: int
    date: date
    voucher_number: Optional[str] = None # Optional if auto-generated (Logic TBD)
    narration: Optional[str] = None
    entries: List[VoucherEntryCreate]

    @root_validator(skip_on_failure=True)
    def check_double_entry(cls, values):
        entries = values.get('entries')
        if not entries:
            raise ValueError('Voucher must have entries')
        
        total_debit = sum(e.amount for e in entries if e.is_debit)
        total_credit = sum(e.amount for e in entries if not e.is_debit)
        
        # Floating point tolerance
        if abs(total_debit - total_credit) > 0.01:
            raise ValueError(f"Double Entry Mismatch: Dr ({total_debit}) != Cr ({total_credit})")
            
        return values
