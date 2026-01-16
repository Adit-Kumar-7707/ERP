from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import Any

from app.db.session import get_db
from app.modules.auth import deps
from app.modules.migration import service

router = APIRouter()

@router.post("/excel")
def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    return service.process_excel_import(db, file, current_user.id)

@router.post("/tally")
def import_tally(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(deps.get_current_active_user)
) -> Any:
    # return service.import_tally_xml(db, file, current_user.id)
    return {"message": "Tally Import Placeholder"}

@router.get("/verify")
def verify_import(
    db: Session = Depends(get_db)
):
    # Call Trial Balance Service check?
    return {"message": "Verification Report"}
