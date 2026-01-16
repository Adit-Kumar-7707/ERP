from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional, Any, Dict

from app.core.db import get_db
from app.modules.reports.engine import ReportEngine
from app.modules.reports.gst import generate_gstr1_json

router = APIRouter()

@router.get("/trial-balance")
def get_trial_balance(end_date: date, db: Session = Depends(get_db)):
    """
    Returns the hierarchical Trial Balance.
    """
    engine = ReportEngine(db)
    return engine.build_trial_balance_tree(end_date)

@router.get("/profit-loss")
def get_profit_loss(start_date: date, end_date: date, db: Session = Depends(get_db)):
    """
    Returns Profit & Loss statement with Income, Expenses, and Net Profit.
    """
    engine = ReportEngine(db)
    return engine.get_profit_loss(start_date, end_date)

@router.get("/balance-sheet")
def get_balance_sheet(end_date: date, db: Session = Depends(get_db)):
    """
    Returns Balance Sheet with Assets, Liabilities, and calculated Capital Account.
    """
    engine = ReportEngine(db)
    return engine.get_balance_sheet(end_date)
