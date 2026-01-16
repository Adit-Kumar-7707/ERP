from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from app.core.db import get_db
from app.modules.accounting.models import VoucherEntry, Voucher, Ledger, VoucherType
from .schemas import BankEntry, ReconcileRequest

router = APIRouter(
    prefix="/banking",
    tags=["Banking"]
)

@router.get("/reconciliation/{ledger_id}", response_model=List[BankEntry])
def get_bank_entries(
    ledger_id: int,
    start_date: date = Query(None), # Optional filter
    end_date: date = Query(None),
    db: Session = Depends(get_db)
):
    # Verify Ledger is a Bank Ledger? (Optional check)
    
    # Query Entries for this Ledger
    # Logic: Fetch ALL Unreconciled + Reconciled within range (if range provided)
    query = db.query(VoucherEntry).join(Voucher).filter(VoucherEntry.ledger_id == ledger_id)
    
    # Order by Voucher Date
    query = query.order_by(Voucher.date)
    
    results = []
    entries = query.all()
    
    for e in entries:
        # Filter Logic in Python for complexity (Unreconciled OR in Date Range)
        is_unreconciled = e.bank_date is None
        is_in_range = True
        if start_date and end_date and e.bank_date:
            is_in_range = start_date <= e.bank_date <= end_date
            
        if is_unreconciled or is_in_range:
            v = e.voucher
            # Determine "Particulars" (The other side of the entry)
            # Simple heuristic: The first entry that is NOT this entry
            # But Voucher has multiple entries.
            # Tally shows "By PartyName".
            other_entry = next((xe for xe in v.entries if xe.id != e.id), None)
            particulars = "Multiple"
            if other_entry:
                # We need to fetch ledger name via relationship. 
                # e.voucher.entries is populated.
                # Accessing other_entry.ledger.name might trigger lazy load.
                particulars = other_entry.ledger.name if other_entry.ledger else "Unknown"

            results.append(BankEntry(
                id=e.id,
                voucher_date=v.date,
                voucher_number=v.voucher_number,
                voucher_type=v.voucher_type.name,
                particulars=particulars,
                instrument_number=e.instrument_number,
                instrument_date=e.instrument_date,
                bank_date=e.bank_date,
                debit=e.amount if e.is_debit else 0,
                credit=e.amount if not e.is_debit else 0
            ))
            
    return results

@router.post("/reconcile")
def reconcile_entries(
    reqs: List[ReconcileRequest],
    db: Session = Depends(get_db)
):
    ids = [r.entry_id for r in reqs]
    entries = db.query(VoucherEntry).filter(VoucherEntry.id.in_(ids)).all()
    
    entry_map = {e.id: e for e in entries}
    
    count = 0
    for r in reqs:
        if r.entry_id in entry_map:
            entry_map[r.entry_id].bank_date = r.bank_date
            count += 1
            
    db.commit()
    return {"message": f"Reconciled {count} entries"}
