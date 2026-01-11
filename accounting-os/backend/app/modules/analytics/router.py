from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from .schemas import DashboardResponse, DashboardMetrics, TrendPoint
from app.modules.accounting.models import JournalLine, JournalEntry, Account, AccountType
from sqlalchemy import func, case, extract, or_
from datetime import date, datetime
from .alerts_router import router as alerts_router

router = APIRouter()
router.include_router(alerts_router, tags=["alerts"])

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_data(db: Session = Depends(get_db)):
    # --- 1. Total Metrics ---
    
    # Revenue (Total)
    revenue_q = db.query(func.sum(JournalLine.credit - JournalLine.debit)).join(Account).filter(Account.type == AccountType.INCOME).scalar() or 0.0
    
    # Expense (Total)
    expense_q = db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account).filter(Account.type == AccountType.EXPENSE).scalar() or 0.0
    
    net_profit = revenue_q - expense_q

    # --- 2. Monthly Metrics (Current Month) ---
    current_month = date.today().month
    current_year = date.today().year
    
    monthly_rev_q = db.query(func.sum(JournalLine.credit - JournalLine.debit))\
        .join(Account).join(JournalEntry)\
        .filter(Account.type == AccountType.INCOME)\
        .filter(extract('month', JournalEntry.date) == current_month)\
        .filter(extract('year', JournalEntry.date) == current_year)\
        .scalar() or 0.0
        
    monthly_exp_q = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account).join(JournalEntry)\
        .filter(Account.type == AccountType.EXPENSE)\
        .filter(extract('month', JournalEntry.date) == current_month)\
        .filter(extract('year', JournalEntry.date) == current_year)\
        .scalar() or 0.0
        
    monthly_profit = monthly_rev_q - monthly_exp_q

    # --- 3. Balance Metrics ---

    # Separate Cash and Bank
    # Assumption: Accounts with 'Cash' in name vs 'Bank' in name
    # Total Cash Balance
    cash_in_hand = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account)\
        .filter(Account.name.ilike('%Cash%'))\
        .scalar() or 0.0
        
    bank_balance = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account)\
        .filter(Account.name.ilike('%Bank%'))\
        .scalar() or 0.0

    # Receivables (Sundry Debtors)
    # Finding group "Sundry Debtors"
    debtors_group = db.query(Account).filter(Account.name == "Sundry Debtors").first()
    receivables = 0.0
    if debtors_group:
         receivables = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
            .join(Account)\
            .filter(Account.parent_id == debtors_group.id)\
            .scalar() or 0.0
            
    # Payables (Sundry Creditors)
    # Liabilities are Credit > Debit, so we want Credit - Debit. 
    # But usually we store as Dr - Cr for consistent math, so Payables = -(Dr - Cr)
    creditors_group = db.query(Account).filter(Account.name == "Sundry Creditors").first()
    payables = 0.0
    if creditors_group:
         pay_net = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
            .join(Account)\
            .filter(Account.parent_id == creditors_group.id)\
            .scalar() or 0.0
         payables = -pay_net

    # GST Metrics
    # GST Payable (Output GST - Liability)
    gst_payable = db.query(func.sum(JournalLine.credit - JournalLine.debit))\
        .join(Account)\
        .filter(Account.type == AccountType.LIABILITY)\
        .filter(or_(Account.name.ilike('%GST%'), Account.name.ilike('%Output%')))\
        .scalar() or 0.0

    # GST Credit (Input GST - Asset/Liability Debit)
    # usually Input GST is an Asset or Liability (Debit balance). 
    # If Liability, Debit > Credit is our "Credit amount"
    gst_credit = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account)\
        .filter(or_(Account.type == AccountType.ASSET, Account.type == AccountType.LIABILITY))\
        .filter(or_(Account.name.ilike('%Input%'), Account.name.ilike('%GST Credit%')))\
        .scalar() or 0.0

    # 4. Trends (Last 6 Months)
    trends = []
    monthly_data = db.query(
        func.strftime('%Y-%m', JournalEntry.date).label('month'),
        func.sum(case((Account.type == AccountType.INCOME, JournalLine.credit - JournalLine.debit), else_=0)).label('revenue'),
        func.sum(case((Account.type == AccountType.EXPENSE, JournalLine.debit - JournalLine.credit), else_=0)).label('expense')
    ).select_from(JournalLine).join(JournalEntry).join(Account).group_by('month').order_by('month').limit(6).all()

    for m in monthly_data:
        trends.append({
            "period": m.month,
            "revenue": m.revenue,
            "expenses": m.expense,
            "profit": m.revenue - m.expense
        })

    return {
        "metrics": {
            "revenue": revenue_q,
            "expenses": expense_q,
            "net_profit": net_profit,
            "cash_balance": cash_in_hand + bank_balance, # Combined for backward compatibility or sum
            "cash_in_hand": cash_in_hand,
            "bank_balance": bank_balance,
            "receivables": receivables,
            "payables": max(0, payables),
            "monthly_revenue": monthly_rev_q,
            "monthly_expenses": monthly_exp_q,
            "monthly_profit": monthly_profit,
            "gst_payable": gst_payable,
            "gst_credit": gst_credit
        },
        "trends": trends,
        "recent_activity": []
    }
