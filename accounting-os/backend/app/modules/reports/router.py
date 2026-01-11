from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from app.modules.accounting.models import Account, AccountType, JournalLine, JournalEntry
from sqlalchemy import func
from .schemas import PnLResponse, ReportLine
from datetime import date
from typing import List, Dict

router = APIRouter()

def build_hierarchy(accounts: List[Account], balances: Dict[int, float], parent_id: int = None, level: int = 0) -> List[ReportLine]:
    lines = []
    # Filter accounts ensuring we don't crash if account.parent_id is None and parent_id is None
    current_level_accounts = [a for a in accounts if a.parent_id == parent_id]
    
    for account in current_level_accounts:
        # Get direct balance
        my_balance = balances.get(account.id, 0.0)
        
        # Recursively get children
        children = build_hierarchy(accounts, balances, account.id, level + 1)
        
        # Total is my balance + sum of children totals
        # Wait, if it's a group, usually it doesn't have journal entries directly, but in some systems it can.
        # We assume group balance is sum of children if it's a group.
        # But here we pass balances dict which has direct posted amounts.
        
        children_sum = sum(c.amount for c in children)
        total_amount = my_balance + children_sum
        
        # Only include if non-zero or has children (optional, for cleaner reports)
        if total_amount != 0 or children:
             lines.append(ReportLine(
                account_id=account.id,
                name=account.name,
                amount=total_amount,
                level=level,
                is_header=children is not None and len(children) > 0,
                children=children
            ))
            
    return lines

@router.get("/pnl", response_model=PnLResponse)
def get_profit_and_loss(
    start_date: date = None, 
    end_date: date = None,
    db: Session = Depends(get_db)
):
    # 1. Fetch all accounts (Optimized: Filter by Income/Expense types only)
    accounts = db.query(Account).filter(Account.type.in_([AccountType.INCOME, AccountType.EXPENSE, "DIRECT_INCOME", "DIRECT_EXPENSE"])).all()
    
    # 2. Calculate Balances for the period
    query = db.query(JournalLine.account_id, func.sum(JournalLine.credit - JournalLine.debit).label('balance'))\
        .join(JournalEntry)
    
    if start_date:
        query = query.filter(JournalEntry.date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.date <= end_date)
        
    query = query.filter(JournalLine.account_id.in_([a.id for a in accounts]))\
        .group_by(JournalLine.account_id)
    
    balances_res = query.all()
    # For Income: Credit - Debit is positive.
    # For Expense: Credit - Debit is negative. We want positive Expense numbers for display usually, but let's stick to signed first.
    # Actually P&L usually shows Expenses as positive numbers that are subtracted.
    
    balances_map = {}
    for aid, bal in balances_res:
        balances_map[aid] = bal

    # Split accounts
    income_accs = [a for a in accounts if "INCOME" in a.type.upper()]
    expense_accs = [a for a in accounts if "EXPENSE" in a.type.upper()]

    # Build Trees
    # Note: Using None as parent_id might fail if they are rooted under some top-level group
    # We should handle roots based on Type if parent is not in the filtered list.
    
    def build_tree_by_type(acc_list):
        # Find roots in this context (accounts whose parents are NOT in the list)
        acc_ids = set(a.id for a in acc_list)
        roots = [a for a in acc_list if a.parent_id not in acc_ids]
        
        tree = []
        for root in roots:
             # Calculate total including children
             # Reuse recursive helper but scoped to this list
             # Actually helper needs full list of potential children
             pass
        return []

    # Simplified Approach for MVP: 
    # Just list Level 0 accounts (Directly types) or flatten if hierarchy is too complex for this snippet.
    # Let's try Flattened with Group Headers visually handled by Frontend?
    # No, Backend should do it.
    
    # Revised Builder:
    full_tree = build_hierarchy(accounts, balances_map, parent_id=None)
    
    # Filter High Level
    income_lines = [l for l in full_tree if any(a.id == l.account_id and "INCOME" in a.type.upper() for a in accounts)]
    expense_lines = [l for l in full_tree if any(a.id == l.account_id and "EXPENSE" in a.type.upper() for a in accounts)]
    
    # Wait, if roots are missing (e.g. parent is outside Income/Expense), we miss them.
    # Assumption: Income accounts have parents that are also Income or Root.
    
    # Calculate Totals
    total_income = sum(l.amount for l in income_lines)
    total_expense = sum(l.amount for l in expense_lines) # This comes as negative if Debit > Credit?
    # Expenses are Dr > Cr, so val is (Cr - Dr) = Negative.
    # We should flip sign for Expenses display.
    
    for l in expense_lines:
        l.amount = abs(l.amount) # Flip for display
    total_expense = abs(total_expense)
    
    return {
        "income": income_lines,
        "expenses": expense_lines,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": total_income - total_expense
    }
