from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional, Union
from datetime import date
from pydantic import BaseModel

from app.core.db import get_db
from app.modules.accounting.models import Voucher, VoucherEntry, VoucherType
# from app.modules.vouchers.schemas import VoucherCreate # defined locally now
from app.modules.vouchers.report_schemas import VoucherSchema
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.auth.permissions import allow_admin
from app.modules.audit.service import log_change
from fastapi.encoders import jsonable_encoder

class VoucherEntryCreate(BaseModel):
    ledger_id: int
    amount: float
    is_debit: bool
    stock_item_id: Optional[int] = None
    quantity: float = 0.0
    rate: float = 0.0
    
    # Bill Allocations
    bill_allocations: Optional[List['BillAllocationCreate']] = None

class BillAllocationCreate(BaseModel):
    ref_type: str
    ref_name: str
    amount: float
    credit_period: Optional[date] = None

VoucherEntryCreate.update_forward_refs()

class VoucherCreate(BaseModel):
    voucher_type_id: Optional[int] = None 
    date: date
    effective_date: Optional[date] = None
    voucher_number: str
    narration: Optional[str] = None
    entries: List[VoucherEntryCreate]

router = APIRouter()

@router.get("/day-book", response_model=List[VoucherSchema])
def get_day_book(
    date: date = Query(..., description="The date to fetch vouchers for"),
    db: Session = Depends(get_db)
):
    """
    Returns all vouchers for a specific date (Tally 'Day Book').
    """
    vouchers = db.query(Voucher).filter(Voucher.date == date).options(
        selectinload(Voucher.voucher_type),
        selectinload(Voucher.entries).selectinload(VoucherEntry.ledger)
    ).all()
    
    # Transformation to match Schema (Flattening relations)
    results = []
    for v in vouchers:
        entries_data = []
        for e in v.entries:
            entries_data.append({
                "id": e.id,
                "ledger_name": e.ledger.name,
                "amount": e.amount,
                "is_debit": e.is_debit
            })
        
        results.append({
            "id": v.id,
            "date": v.date,
            "voucher_number": v.voucher_number,
            "voucher_type_name": v.voucher_type.name,
            "narration": v.narration,
            "entries": entries_data
        })
        
    return results

@router.post("/", response_model=dict)
def create_voucher(
    voucher_in: VoucherCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Records a new accounting voucher.
    Strict Double Entry validation is handled by Pydantic Schema.
    """
    
    # 1. Fetch Voucher Type
    v_type = db.query(VoucherType).filter(VoucherType.id == voucher_in.voucher_type_id).first()
    if not v_type:
        raise HTTPException(status_code=404, detail="Voucher Type not found")

    # 2. Generate Number (Simple Auto-Increment for now)
    # Tally Parity: Logic is complex (Daily/Monthly/Yearly/Manual).
    # MVP: "AUTO-<ID>" placeholder, updated after flush or just use Input if Manual.
    final_v_number = voucher_in.voucher_number
    if not final_v_number:
        # Check numbering method
        if v_type.numbering_method == "Automatic":
            # Very basic auto-increment logic
            count = db.query(Voucher).filter(Voucher.voucher_type_id == v_type.id).count()
            next_num = count + 1
            
            prefix = v_type.numbering_prefix or ""
            suffix = v_type.numbering_suffix or ""
            
            final_v_number = f"{prefix}{next_num}{suffix}"
        else:
            raise HTTPException(status_code=400, detail="Voucher Number required for Manual numbering")

    # 3. Create Header
    voucher = Voucher(
        voucher_type_id=v_type.id,
        date=voucher_in.date,
        effective_date=voucher_in.effective_date or voucher_in.date,
        voucher_number=final_v_number,
        narration=voucher_in.narration
    )
    db.add(voucher)
    db.flush() # Get ID
    
    # 4. Create Entries
    from app.modules.accounting.models import BillAllocation
    
    for entry in voucher_in.entries:
        db_entry = VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=entry.ledger_id,
            amount=entry.amount,
            is_debit=entry.is_debit,
            stock_item_id=entry.stock_item_id,
            quantity=entry.quantity,
            rate=entry.rate
        )
        db.add(db_entry)
        db.flush() # Need ID for Bill Allocations

        if entry.bill_allocations:
            for bill in entry.bill_allocations:
                db_bill = BillAllocation(
                    voucher_entry_id=db_entry.id,
                    ref_type=bill.ref_type,
                    ref_name=bill.ref_name,
                    amount=bill.amount,
                    credit_period=bill.credit_period
                )
                db.add(db_bill)
        
    db.commit()
    
    # Audit Log
    log_change(
        db, 
        "Voucher", 
        voucher.id, 
        "CREATE", 
        current_user.id, 
        jsonable_encoder(voucher_in)
    )

    return {"status": "success", "id": voucher.id, "number": final_v_number}

from app.modules.vouchers.report_schemas import VoucherDetailSchema

@router.get("/{id}", response_model=VoucherDetailSchema)
def get_voucher_by_id(id: int, db: Session = Depends(get_db)):
    voucher = db.query(Voucher).filter(Voucher.id == id).options(
        selectinload(Voucher.entries).selectinload(VoucherEntry.ledger),
        selectinload(Voucher.entries).selectinload(VoucherEntry.stock_item)
    ).first()
    
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
        
    # Manual Mapping because Nested Pydantic with Relations acts weird sometimes if property names don't match exactly 
    # or if we need flat string from Object.
    # VoucherEntryDetailSchema expects `ledger_name` (str) but model has `ledger` (Obj).
    # We can do a transformation here.
    
    entries_data = []
    for e in voucher.entries:
        entries_data.append({
            "id": e.id,
            "ledger_id": e.ledger_id,
            "ledger_name": e.ledger.name if e.ledger else "",
            "amount": e.amount,
            "is_debit": e.is_debit,
            "stock_item_id": e.stock_item_id,
            "stock_item_name": e.stock_item.name if e.stock_item else None,
            "quantity": e.quantity,
            "rate": e.rate,
            "hsn_code": e.stock_item.hsn_code if e.stock_item else None,
            "gst_rate": e.stock_item.gst_rate if e.stock_item else None
        })
        
    return {
        "id": voucher.id,
        "voucher_type_id": voucher.voucher_type_id,
        "date": voucher.date,
        "voucher_number": voucher.voucher_number,
        "narration": voucher.narration,
        "entries": entries_data
    }

@router.put("/{id}", response_model=dict)
def update_voucher(
    id: int, 
    voucher_in: VoucherCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    voucher = db.query(Voucher).filter(Voucher.id == id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")

    # 1. Update Header
    voucher.date = voucher_in.date
    voucher.narration = voucher_in.narration
    if voucher_in.voucher_number:
        voucher.voucher_number = voucher_in.voucher_number
    
    # 2. Update Entries
    # Strategy: Delete All, Re-insert
    # Use ORM delete to ensure cascade (BillAllocations)
    existing_entries = db.query(VoucherEntry).filter(VoucherEntry.voucher_id == id).all()
    for e in existing_entries:
        db.delete(e)
    db.flush() # Ensure deletion happens before re-insertion
    
    for entry in voucher_in.entries:
        db_entry = VoucherEntry(
            voucher_id=voucher.id,
            ledger_id=entry.ledger_id,
            amount=entry.amount,
            is_debit=entry.is_debit,
            stock_item_id=entry.stock_item_id,
            quantity=entry.quantity,
            rate=entry.rate
        )
        db.add(db_entry)
        db.flush()
        
        if entry.bill_allocations:
            from app.modules.accounting.models import BillAllocation
            for bill in entry.bill_allocations:
                db_bill = BillAllocation(
                    voucher_entry_id=db_entry.id,
                    ref_type=bill.ref_type,
                    ref_name=bill.ref_name,
                    amount=bill.amount,
                    credit_period=bill.credit_period
                )
                db.add(db_bill)
        
    db.commit()
    
    # Audit Log
    log_change(
        db, 
        "Voucher", 
        voucher.id, 
        "UPDATE", 
        current_user.id, 
        jsonable_encoder(voucher_in)
    )
    
    return {"status": "updated", "id": voucher.id}

@router.delete("/{id}", response_model=dict)
def delete_voucher(
    id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_admin) # Only Admin can delete
):
    voucher = db.query(Voucher).filter(Voucher.id == id).first()
    if not voucher:
        raise HTTPException(status_code=404, detail="Voucher not found")
        
    # Cascade delete is usually handled by DB, but explicit is safer for logic
    db.query(VoucherEntry).filter(VoucherEntry.voucher_id == id).delete()
    db.delete(voucher)
    db.commit()
    
    # Audit Log
    log_change(
        db, 
        "Voucher", 
        id, 
        "DELETE", 
        current_user.id
    )
    
    return {"status": "deleted", "id": id}
