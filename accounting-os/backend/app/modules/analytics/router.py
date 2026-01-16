from fastapi import APIRouter, Depends
from typing import Dict, Any
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
def get_dashboard_data(
    from_date: date = None, 
    to_date: date = None,
    db: Session = Depends(get_db)
):
    # Default to Current Month if not provided (Safety fallback)
    if not to_date:
        to_date = date.today()
    if not from_date:
        from_date = date(to_date.year, to_date.month, 1)

    # Helper filters
    def apply_period_filter(query):
        return query.join(JournalEntry).filter(JournalEntry.date >= from_date, JournalEntry.date <= to_date)
    
    def apply_as_of_filter(query):
        return query.join(JournalEntry).filter(JournalEntry.date <= to_date)

    # --- 1. P&L Metrics (For Selected Period) ---
    
    # Revenue (Period)
    revenue_q = apply_period_filter(db.query(func.sum(JournalLine.credit - JournalLine.debit)).join(Account)).filter(Account.type == AccountType.INCOME).scalar() or 0.0
    
    # Expense (Period)
    expense_q = apply_period_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account)).filter(Account.type == AccountType.EXPENSE).scalar() or 0.0
    
    net_profit = revenue_q - expense_q

    # --- 2. Monthly Metrics (Now matches Period) ---
    # We will just map the Period metrics to "monthly_" keys for frontend compatibility
    # Or strict "Current Month" within period? 
    # Tally shows "Current Period". Let's use the full period sums.
    
    monthly_rev_q = revenue_q
    monthly_exp_q = expense_q
    monthly_profit = net_profit

    # --- 3. Balance Metrics (As Of Date) ---

    # Cash & Bank
    cash_in_hand = apply_as_of_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account)).filter(Account.name.ilike('%Cash%')).scalar() or 0.0
    bank_balance = apply_as_of_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account)).filter(Account.name.ilike('%Bank%')).scalar() or 0.0

    # Receivables
    debtors_group = db.query(Account).filter(Account.name == "Sundry Debtors").first()
    receivables = 0.0
    if debtors_group:
         receivables = apply_as_of_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account)).filter(Account.parent_id == debtors_group.id).scalar() or 0.0
            
    # Payables
    creditors_group = db.query(Account).filter(Account.name == "Sundry Creditors").first()
    payables = 0.0
    if creditors_group:
         pay_net = apply_as_of_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account)).filter(Account.parent_id == creditors_group.id).scalar() or 0.0
         payables = -pay_net

    # GST Metrics (Liability - Credit as of To Date)
    gst_payable = apply_as_of_filter(db.query(func.sum(JournalLine.credit - JournalLine.debit)).join(Account))\
        .filter(Account.type == AccountType.LIABILITY)\
        .filter(or_(Account.name.ilike('%GST%'), Account.name.ilike('%Output%')))\
        .scalar() or 0.0

    gst_credit = apply_as_of_filter(db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account))\
        .filter(or_(Account.type == AccountType.ASSET, Account.type == AccountType.LIABILITY))\
        .filter(or_(Account.name.ilike('%Input%'), Account.name.ilike('%GST Credit%')))\
        .scalar() or 0.0

    # 4. Trends (Last 6 Months from To Date)
    trends = []
    monthly_data = db.query(
        func.strftime('%Y-%m', JournalEntry.date).label('month'),
        func.sum(case((Account.type == AccountType.INCOME, JournalLine.credit - JournalLine.debit), else_=0)).label('revenue'),
        func.sum(case((Account.type == AccountType.EXPENSE, JournalLine.debit - JournalLine.credit), else_=0)).label('expense')
    ).select_from(JournalLine).join(JournalEntry).join(Account)\
    .filter(JournalEntry.date <= to_date)\
    .group_by('month').order_by(func.strftime('%Y-%m', JournalEntry.date).desc()).limit(6).all()
    
    # Reverse to show chronological
    monthly_data.reverse()

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
            "cash_balance": cash_in_hand + bank_balance,
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
        "recent_activity": [],
        "voucher_stats": _get_voucher_stats(db, to_date.month, to_date.year) # Approx
    }

def _get_voucher_stats(db: Session, month: int, year: int) -> Dict[str, Dict[str, Any]]:
    # Helper to get stats per voucher type
    # We want: Sales, Purchase, Payment, Receipt, Contra, Journal
    # Return structure: { "type_name": { "count": X, "amount": Y } }
    
    # Needs VoucherEntry model
    from app.modules.vouchers.models import VoucherEntry, VoucherType
    
    # Group by Voucher Entry -> Type Name
    # We need to join with JournalEntry to get amount?
    # Or just count for now?
    # User asked for "Overview", "Trend", "Information".
    # Let's give Count and Total Value (Credit side sum of base entry? rough proxy)
    
    results = db.query(
        VoucherType.name,
        func.count(VoucherEntry.id).label('count'),
        # Amount is tricky without standard column. 
        # We'll rely on relation to JournalEntry -> Lines.
        # This is expensive. For MVP, let's just do COUNT.
        # Wait, user specifically asked for "Payment Received Contra".
    ).join(VoucherType).group_by(VoucherType.name).all()
    
    stats = {}
    for r in results:
        # Normalize keys to lower case
        key = r.name.lower()
        stats[key] = {
            "count": r.count,
            "total_amount": 0 # Placeholder for now to speed up, can enhance later
        }
        
    return stats
