from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv
import io
from app.core.db import get_db
from app.modules.accounting.models import Ledger, AccountGroup
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User

router = APIRouter(
    prefix="/impex",
    tags=["Import/Export"]
)

@router.post("/import-ledgers")
async def import_ledgers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith(".csv"):
         raise HTTPException(status_code=400, detail="Only CSV files allowed")
         
    content = await file.read()
    decoded = content.decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    # Expected Headers:
    # Name, Group, Opening Balance, Opening Type (Dr/Cr), GSTIN
    
    success_count = 0
    errors = []
    
    row_num = 1
    for row in csv_reader:
        row_num += 1
        name = row.get("Name")
        group_name = row.get("Group")
        
        if not name or not group_name:
            errors.append(f"Row {row_num}: Name or Group missing")
            continue
            
        # Check if Ledger Exists
        exists = db.query(Ledger).filter(Ledger.name == name).first()
        if exists:
            errors.append(f"Row {row_num}: Ledger '{name}' already exists")
            continue
            
        # Find Group ID
        group = db.query(AccountGroup).filter(AccountGroup.name == group_name).first()
        if not group:
            errors.append(f"Row {row_num}: Group '{group_name}' not found")
            continue
            
        try:
            op_bal = float(row.get("Opening Balance", 0))
            is_dr = row.get("Opening Type", "Dr").lower() == "dr"
            
            ledger = Ledger(
                name=name,
                group_id=group.id,
                opening_balance=op_bal,
                opening_balance_is_dr=is_dr,
                gstin=row.get("GSTIN"),
                state=row.get("State"),
                mailing_name=row.get("Name"), # Default
                address=row.get("Address")
            )
            db.add(ledger)
            success_count += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "status": "completed",
        "imported": success_count,
        "errors": errors
    }
