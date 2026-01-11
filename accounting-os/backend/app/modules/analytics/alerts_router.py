from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from .models import Alert
from app.modules.accounting.models import JournalLine, Account, AccountType
from sqlalchemy import func
from datetime import datetime

router = APIRouter()

@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.is_active == True).order_by(Alert.created_at.desc()).all()

@router.post("/alerts/scan")
def trigger_scan(db: Session = Depends(get_db)):
    # 1. Clear old auto-generated alerts to avoid dups (optional)
    # db.query(Alert).delete() 
    
    alerts_found = []

    # Check 1: Negative Cash Balance
    cash_bal = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account).filter(Account.name.ilike('%Cash%')).scalar() or 0
    
    if cash_bal < 0:
        alerts_found.append(Alert(
            title="Negative Cash Balance",
            message=f"Current cash balance is negative: {cash_bal}",
            severity="critical"
        ))

    # Check 2: High Expenses (Spike Detection - Simplified)
    # If Expense > Revenue
    revenue = db.query(func.sum(JournalLine.credit - JournalLine.debit)).join(Account).filter(Account.type == AccountType.INCOME).scalar() or 0
    expense = db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account).filter(Account.type == AccountType.EXPENSE).scalar() or 0
    
    if expense > revenue and revenue > 0: # Only if we have revenue
         alerts_found.append(Alert(
            title="High Expenses",
            message=f"Expenses ({expense}) exceed Revenue ({revenue}) for this period.",
            severity="warning"
        ))

    # Save alerts
    for alert in alerts_found:
        # Check if similar active alert exists
        exists = db.query(Alert).filter(Alert.title == alert.title, Alert.is_active == True).first()
        if not exists:
            db.add(alert)
    
    db.commit()
    return {"status": "scanned", "alerts_generated": len(alerts_found)}
