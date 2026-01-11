from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth import deps
from app.modules.vouchers.models import VoucherType
from app.modules.vouchers import schemas

router = APIRouter()

@router.get("/types", response_model=List[schemas.VoucherType])
def read_voucher_types(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve voucher types.
    """
    types = db.query(VoucherType).offset(skip).limit(limit).all()
    return types

@router.post("/types", response_model=schemas.VoucherType)
def create_voucher_type(
    *,
    db: Session = Depends(deps.get_db),
    voucher_type_in: schemas.VoucherTypeCreate,
) -> Any:
    """
    Create new voucher type.
    """
    # Check uniqueness
    if db.query(VoucherType).filter(VoucherType.name == voucher_type_in.name).first():
        raise HTTPException(status_code=400, detail="Voucher type with this name already exists")
        
    voucher_type = VoucherType(
        name=voucher_type_in.name,
        type_group=voucher_type_in.type_group,
        sequence_type=voucher_type_in.sequence_type,
        prefix=voucher_type_in.prefix,
        settings=voucher_type_in.settings,
        default_debit_account_id=voucher_type_in.default_debit_account_id,
        default_credit_account_id=voucher_type_in.default_credit_account_id,
    )
    db.add(voucher_type)
    db.commit()
    db.refresh(voucher_type)
    return voucher_type

@router.post("/entries", response_model=schemas.VoucherEntry)
def create_voucher_entry(
    *,
    db: Session = Depends(deps.get_db),
    entry_in: schemas.VoucherEntryCreate,
):
    from app.modules.vouchers.models import VoucherEntry, VoucherType
    from app.modules.accounting.models import JournalEntry, JournalLine
    from app.modules.rules.engine import RuleValidator, RuleEvent, RuleAction

    # 1. Run Rule Validation
    validator = RuleValidator(db)
    # Convert Pydantic model to dict for rule engine
    # We dump 'entry_in' but 'lines' are inside.
    data_context = entry_in.model_dump()
    
    validation_results = validator.validate(
        voucher_data=data_context, 
        event=RuleEvent.BEFORE_SAVE,
        voucher_type_id=entry_in.voucher_type_id
    )
    
    # Check for Blocks
    for res in validation_results:
        if res['action'] == RuleAction.BLOCK:
            raise HTTPException(status_code=400, detail=f"Blocked by Rule '{res['rule_name']}': {res['message']}")

    # 2. Get Voucher Type for Config (Sequence)
    voucher_type = db.query(VoucherType).filter(VoucherType.id == entry_in.voucher_type_id).first()
    if not voucher_type:
        raise HTTPException(status_code=404, detail="Voucher Type not found")

    # 3. Generate Voucher Number (Simplified Auto Logic)
    # If AUTO and not provided, generate.
    final_voucher_no = entry_in.voucher_number
    if voucher_type.sequence_type == "automatic":
        # Simple format: PREFIX-SEQ (ex: PAY-001)
        # In a real app, strict locking needed here.
        seq = voucher_type.current_sequence
        prefix = voucher_type.prefix or "VCH"
        final_voucher_no = f"{prefix}-{seq:04d}"
        
        # Increment sequence
        voucher_type.current_sequence += 1
        db.add(voucher_type)

    if not final_voucher_no:
        raise HTTPException(status_code=400, detail="Voucher Number required for manual sequencing")

    # Check for duplicate voucher number
    if db.query(VoucherEntry).filter(VoucherEntry.voucher_number == final_voucher_no).first():
         raise HTTPException(status_code=400, detail=f"Voucher Number {final_voucher_no} already exists")

    # 4. Create Core Journal Entry
    # Vouchers map to Journal Entries.
    journal_entry = JournalEntry(
        date=entry_in.date,
        voucher_type=voucher_type.name, # Use name as type string for core
        reference=final_voucher_no,
        narration=entry_in.narration
    )
    db.add(journal_entry)
    db.flush() # Get ID

    # 5. Create Journal Lines
    for line in entry_in.lines:
        j_line = JournalLine(
            entry_id=journal_entry.id,
            account_id=line.account_id,
            debit=line.debit,
            credit=line.credit,
            description=line.description
        )
        db.add(j_line)

    # 6. Create Voucher Entry Wrapper
    voucher_entry = VoucherEntry(
        voucher_type_id=voucher_type.id,
        voucher_number=final_voucher_no,
        journal_entry_id=journal_entry.id
    )
    db.add(voucher_entry)
    
    try:
        db.commit()
        db.refresh(voucher_entry)
        # Return response. Mapping might fail if schema expects 'date' from relation.
        # We manually map if needed or ensure relation is loaded.
        # For simplicity, returning object.
        return voucher_entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/entries", response_model=List[schemas.VoucherEntry])
def read_voucher_entries(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve voucher entries.
    """
    from app.modules.vouchers.models import VoucherEntry
    # For now, simple fetch. Ideally join with Type to get names.
    entries = db.query(VoucherEntry).offset(skip).limit(limit).all()
    # Pydantic schema must handle relation loading or we need eager loading if we want 'type' name etc.
    return entries
