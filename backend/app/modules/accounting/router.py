from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.config import settings
from app.modules.accounting.models import AccountGroup, Ledger, Base, Organization
from app.core.db import get_db

router = APIRouter()

# --- Schemas ---
class LedgerSchema(BaseModel):
    id: int
    name: str
    opening_balance: float
    gstin: Optional[str]
    state: Optional[str]
    duty_head: Optional[str]
    tax_type: Optional[str]
    effective_gst_rate: float
    
    class Config:
        from_attributes = True

class GroupSchema(BaseModel):
    id: int
    name: str
    nature: str
    children: Optional[List['GroupSchema']] = None
    ledgers: Optional[List[LedgerSchema]] = None
    
    class Config:
        from_attributes = True

class LedgerCreate(BaseModel):
    name: str
    group_id: int
    opening_balance: float = 0.0
    
    # GST / Mailing
    mailing_name: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    gstin: Optional[str] = None
    registration_type: str = "Regular"
    
    # Duties
    tax_type: Optional[str] = None # GST/Others
    duty_head: Optional[str] = None # CGST/SGST...
    percentage_of_calculation: float = 0.0

# --- API ---

@router.post("/ledgers", response_model=LedgerSchema)
def create_ledger(ledger_in: LedgerCreate, db: Session = Depends(get_db)):
    """
    Creates a new Ledger under a specific Group.
    """
    # Check if group exists
    group = db.query(AccountGroup).filter(AccountGroup.id == ledger_in.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Parent Group not found")
        
    # Check duplicate name
    existing = db.query(Ledger).filter(Ledger.name == ledger_in.name).first()
    if existing:
         raise HTTPException(status_code=400, detail="Ledger with this name already exists")
         
    ledger = Ledger(**ledger_in.dict()) 
    # Using **ledger_in.dict() simplifies assignment!
    
    db.add(ledger)
    db.commit()
    db.refresh(ledger)
    return ledger

@router.delete("/ledgers/{id}", response_model=dict)
def delete_ledger(id: int, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError
    ledger = db.query(Ledger).filter(Ledger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
        
    try:
        db.delete(ledger)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete Ledger. It is likely used in Transactions.")
        
    return {"status": "deleted", "id": id}

@router.put("/ledgers/{id}", response_model=LedgerSchema)
def update_ledger(id: int, ledger_in: LedgerCreate, db: Session = Depends(get_db)):
    """
    Updates an existing Ledger.
    """
    ledger = db.query(Ledger).filter(Ledger.id == id).first()
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
        
    # Check duplicate name if changed
    if ledger.name != ledger_in.name:
         existing = db.query(Ledger).filter(Ledger.name == ledger_in.name).first()
         if existing:
              raise HTTPException(status_code=400, detail="Ledger name already in use")

    # Update all fields from schema
    data = ledger_in.dict(exclude_unset=True)
    for key, value in data.items():
        setattr(ledger, key, value)
    
    db.commit()
    db.refresh(ledger)
    return ledger

@router.get("/chart-of-accounts", response_model=List[GroupSchema])
def get_chart_of_accounts(db: Session = Depends(get_db)):
    """
    Returns the full hierarchy starting from the Primary Groups.
    """
    from sqlalchemy.orm import selectinload
    # 1. Fetch Roots with recursive loading? 
    # selectinload allows recursion if configured or we just chain it.
    # Tally depth is usually 4-5 max. 
    # Let's try loading children and ledgers.
    # Note: For fully recursive eager load, usually we need a specific query or lazy=False.
    # But let's try basic selectinload first.
    
    roots = db.query(AccountGroup).filter(AccountGroup.parent_id == None).options(
        selectinload(AccountGroup.children).selectinload(AccountGroup.children), # Level 2
        selectinload(AccountGroup.ledgers)
    ).all()
    return roots # For deeper levels, might need loop or CTE. MVP: Level 2 depth.

# Schema for Ledger Vouchers
from datetime import date
class LedgerVoucherItem(BaseModel):
    id: int # Entry ID (or Voucher ID)
    date: date
    voucher_id: int
    voucher_number: Optional[str]
    voucher_type: str
    particulars: str
    debit: float
    credit: float

@router.get("/ledger/{id}/vouchers", response_model=List[LedgerVoucherItem])
def get_ledger_vouchers(
    id: int, 
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 2000,
    db: Session = Depends(get_db)
):
    """
    Returns monthly/all transactions for a ledger.
    """
    from app.modules.accounting.models import VoucherEntry, VoucherType, Voucher
    
    # Check if ledger exists
    ledger = db.query(Ledger).filter(Ledger.id == id).first()
    if not ledger:
        return []

    # Get entries
    query = db.query(VoucherEntry).join(VoucherEntry.voucher).filter(VoucherEntry.ledger_id == id)
    
    if from_date:
        query = query.filter(Voucher.date >= from_date)
    if to_date:
        query = query.filter(Voucher.date <= to_date)
        
    entries = query.offset(skip).limit(limit).all()
    
    items = []
    
    # Opening Balance Row? (For Reporting, handled in Frontend usually, or separate API)
    # We just return transaction list here.
    
    for e in entries:
        # Determine Particulars: The 'other' side of entry.
        # This is expensive per row. Ideal query uses join.
        # Simple Logic: Get all entries for this Voucher except this one.
        other_entries = [x for x in e.voucher.entries if x.id != e.id]
        particulars = "By/To Details"
        if other_entries:
            particulars = other_entries[0].ledger.name 
            if len(other_entries) > 1:
                particulars += " (as per details)"
                
        items.append(LedgerVoucherItem(
            id=e.id,
            date=e.voucher.date,
            voucher_id=e.voucher.id,
            voucher_number=e.voucher.voucher_number,
            voucher_type=e.voucher.voucher_type.name,
            particulars=particulars,
            debit=e.amount if e.is_debit else 0,
            credit=e.amount if not e.is_debit else 0
        ))
        
    return sorted(items, key=lambda x: x.date)


# --- Voucher Type Management ---

class VoucherTypeSchema(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    nature: str
    numbering_method: str
    prevent_duplicates: bool
    numbering_prefix: Optional[str]
    numbering_suffix: Optional[str]
    
    class Config:
        from_attributes = True

class VoucherTypeUpdate(BaseModel):
    numbering_method: str
    prevent_duplicates: bool
    numbering_prefix: Optional[str]
    numbering_suffix: Optional[str]

@router.get("/voucher-types", response_model=List[VoucherTypeSchema])
def get_voucher_types(db: Session = Depends(get_db)):
    """
    Returns all voucher types.
    """
    from app.modules.accounting.models import VoucherType
    return db.query(VoucherType).all()
# --- Organization Endpoints ---

class OrganizationUpdate(BaseModel):
    name: Optional[str]
    country: Optional[str]
    state: Optional[str]
    pin_code: Optional[str]
    gstin: Optional[str]
    gst_registration_date: Optional[date]

@router.get("/organization", response_model=dict)
def get_organization(db: Session = Depends(get_db)):
    org = db.query(Organization).first()
    if not org:
        # Auto-seed if missing? Or return 404. 
        # For MVP, let's auto-seed if absolutely empty or fail.
        # Ideally setup creates it.
        raise HTTPException(status_code=404, detail="Organization not set up")
    
    return {
        "id": org.id,
        "name": org.name,
        "state": org.state,
        "country": org.country,
        "gstin": org.gstin,
        "financial_year_start": org.financial_year_start
    }

@router.put("/organization", response_model=dict)
def update_organization(org_in: OrganizationUpdate, db: Session = Depends(get_db)):
    org = db.query(Organization).first()
    if not org:
         raise HTTPException(status_code=404, detail="Organization not set up")
    
    if org_in.name: org.name = org_in.name
    if org_in.state: org.state = org_in.state
    if org_in.gstin: org.gstin = org_in.gstin
    
    db.commit()
    db.refresh(org)
    return {"status": "updated", "gstin": org.gstin}
@router.put("/voucher-types/{id}", response_model=VoucherTypeSchema)
def update_voucher_type(id: int, vtype: VoucherTypeUpdate, db: Session = Depends(get_db)):
    from app.modules.accounting.models import VoucherType
    
    db_obj = db.query(VoucherType).filter(VoucherType.id == id).first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Voucher Type not found")
        
    db_obj.numbering_method = vtype.numbering_method
    db_obj.prevent_duplicates = vtype.prevent_duplicates
    db_obj.numbering_prefix = vtype.numbering_prefix
    db_obj.numbering_suffix = vtype.numbering_suffix
    
    db.commit()
    db.refresh(db_obj)
    return db_obj

