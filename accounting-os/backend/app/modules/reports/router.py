from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date

from app.db.session import get_db
from app.modules.reports import service
# from app.modules.auth.deps import get_current_active_user

router = APIRouter()

@router.get("/trial-balance")
def get_trial_balance(
    as_of: date = Query(..., description="As of date"),
    db: Session = Depends(get_db)
):
    return service.get_trial_balance(db, as_of)

@router.get("/profit-and-loss")
def get_profit_and_loss(
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db)
):
    return service.get_profit_and_loss(db, from_date, to_date)

@router.get("/balance-sheet")
def get_balance_sheet(
    as_of: date,
    db: Session = Depends(get_db)
):
    return service.get_balance_sheet(db, as_of)

@router.get("/ledger/{account_id}")
def get_ledger_statement(
    account_id: int,
    from_date: date,
    to_date: date,
    db: Session = Depends(get_db)
):
    return service.get_ledger_statement(db, account_id, from_date, to_date)

# Placeholder: GST and Inventory Reports
@router.get("/gst/gstr-1")
def get_gstr1(
    from_date: date, 
    to_date: date, 
    db: Session = Depends(get_db)
):
    # TODO: Implement in GST Engine or here
    return {"message": "Not implemented yet"}

@router.get("/inventory/stock-summary")
def get_stock_summary(
    as_of: date,
    db: Session = Depends(get_db)
):
    # TODO: Call Inventory Engine
    return {"message": "Not implemented yet"}
