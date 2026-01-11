from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from .schemas import DashboardResponse, DashboardMetrics, TrendPoint
from app.modules.accounting.models import JournalLine, JournalEntry
from sqlalchemy import func, case
from .alerts_router import router as alerts_router

router = APIRouter()
router.include_router(alerts_router, tags=["alerts"])

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Calculate Totals (Revenue, Expense, Assets, Liabilities)
    # We need to join Account to Filter by Type
    from app.modules.accounting.models import Account, AccountType
    
    # Revenue: Credits - Debits for Income Accounts
    revenue_q = db.query(func.sum(JournalLine.credit - JournalLine.debit)).join(Account).filter(Account.type == AccountType.INCOME).scalar() or 0
    
    # Expenses: Debits - Credits for Expense Accounts
    expense_q = db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account).filter(Account.type == AccountType.EXPENSE).scalar() or 0
    
    net_profit = revenue_q - expense_q

    # Cash Balance: Debits - Credits for Cash/Bank Accounts
    cash_balance = db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(Account).filter(Account.name.ilike('%Cash%') | Account.name.ilike('%Bank%')).scalar() or 0
    
    # Receivables (Sundry Debtors)
    # Strategy: Find the Group Account "Sundry Debtors", then sum up all its children.
    # Note: detailed implementation would require recursive CTE for deep nesting.
    # MVP: Assume 1-level depth (Ledgers directly under Group)
    
    def get_group_balance(group_name):
        group = db.query(Account).filter(Account.name == group_name, Account.is_group == 1).first()
        if not group:
            return 0.0
        
        # Get all children IDs
        # If we had recursive model we would fetch all descendants
        # Simple version: Direct children
        return db.query(func.sum(JournalLine.debit - JournalLine.credit))\
            .join(Account)\
            .filter(Account.parent_id == group.id)\
            .scalar() or 0

    receivables = get_group_balance("Sundry Debtors")
    payables = get_group_balance("Sundry Creditors") * -1

    # 2. Trends (Last 6 Months)
    # This requires Group By Month. SQLite specific: strftime('%Y-%m', date)
    trends = []
    # Using JournalLine joined with JournalEntry to get date
    # Using JournalLine joined with JournalEntry to get date
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
            "cash_balance": cash_balance,
            "receivables": receivables,
            "payables": abs(payables)
        },
        "trends": trends,
        "recent_activity": []
    }
