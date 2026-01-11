from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from app.modules.accounting.models import Account, AccountType, JournalLine, JournalEntry
from sqlalchemy import func
from datetime import date
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db
from app.modules.accounting.models import Account, AccountType, JournalLine, JournalEntry
from sqlalchemy import func
from .schemas import PnLResponse, ReportLine, TrialBalanceResponse, TrialBalanceLine, BalanceSheetResponse, LedgerStatementResponse, LedgerEntry

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

@router.get("/trial-balance", response_model=TrialBalanceResponse)
def get_trial_balance(
    start_date: date = None, 
    end_date: date = None,
    db: Session = Depends(get_db)
):
    query = db.query(
        Account.id, 
        Account.name, 
        Account.type,
        func.sum(JournalLine.debit).label('debit'),
        func.sum(JournalLine.credit).label('credit')
    ).join(JournalLine).join(JournalEntry).group_by(Account.id)
    
    if start_date:
        query = query.filter(JournalEntry.date >= start_date)
    if end_date:
        query = query.filter(JournalEntry.date <= end_date)
        
    lines = []
    total_debit = 0.0
    total_credit = 0.0
    
    for row in query.all():
        # TB shows net balance usually, but some show raw total debits/credits.
        # Let's show Net Debit or Net Credit.
        net = row.debit - row.credit
        db_val = max(0, net)
        cr_val = max(0, -net)
        
        # Or standard TB column style:
        # lines.append(TrialBalanceLine(
        #    account_id=row.id,
        #    account_name=row.name,
        #    type=row.type,
        #    debit=row.debit,
        #    credit=row.credit
        # ))
        # total_debit += row.debit
        # total_credit += row.credit

        # Net Balance style
        lines.append(TrialBalanceLine(
            account_id=row.id,
            account_name=row.name,
            type=str(row.type),
            debit=max(0, row.debit - row.credit),
            credit=max(0, row.credit - row.debit)
        ))
        total_debit += max(0, row.debit - row.credit)
        total_credit += max(0, row.credit - row.debit)
        
    return {
        "lines": lines,
        "total_debit": total_debit,
        "total_credit": total_credit
    }

@router.get("/balance-sheet", response_model=BalanceSheetResponse)
def get_balance_sheet(
    end_date: date = None, # BS is "as of" date
    db: Session = Depends(get_db)
):
    # Fetch Asset, Liability, Equity
    accounts = db.query(Account).filter(Account.type.in_([
        AccountType.ASSET, AccountType.LIABILITY, AccountType.EQUITY, 
        "ASSET", "LIABILITY", "EQUITY" # Handle string enums if mixed
    ])).all()
    
    query = db.query(JournalLine.account_id, func.sum(JournalLine.credit - JournalLine.debit).label('balance'))\
        .join(JournalEntry)
        
    if end_date:
        query = query.filter(JournalEntry.date <= end_date)
        
    query = query.filter(JournalLine.account_id.in_([a.id for a in accounts]))\
        .group_by(JournalLine.account_id)
        
    balances_res = query.all()
    balances_map = {row.account_id: row.balance for row in balances_res}
    
    full_tree = build_hierarchy(accounts, balances_map, parent_id=None)
    
    assets = [l for l in full_tree if any(a.id == l.account_id and "ASSET" in a.type.upper() for a in accounts)]
    liabilities = [l for l in full_tree if any(a.id == l.account_id and "LIABILITY" in a.type.upper() for a in accounts)]
    equity = [l for l in full_tree if any(a.id == l.account_id and "EQUITY" in a.type.upper() for a in accounts)]
    
    # Calculate Net P&L to add to Equity (Retained Earnings)
    # This is complex: Need to calc P&L for all time up to end_date
    pnl = get_profit_and_loss(start_date=date(1900,1,1), end_date=end_date, db=db)
    net_profit = pnl['net_profit']
    
    # Add Net Profit to Equity
    equity.append(ReportLine(
        name="Net Profit (Current Period)",
        amount=net_profit, # Profit is Credit (positive) normally in Equity, but P&L return is Income - Expense. 
                           # If Income > Expense, Profit > 0. Equity increases (Credit).
                           # So simple addition?
                           # Wait, P&L function returns Income (Credits) - Expenses (Debits). 
                           # If net_profit is positive, we credit Retained Earnings (Liability side basically).
                           # Balances here: Equity is Credit - Debit. 
                           # So yes, positive Net Profit adds to Equity.
        account_id=None,
        level=0
    ))
    
    # Sign Handling for Display:
    # Assets: Debit > Credit (Balance < 0 in our logic). Flip for display.
    # Liabilities: Credit > Debit (Balance > 0). Keep.
    # Equity: Credit > Debit (Balance > 0). Keep.
    
    for l in assets:
        l.amount = abs(l.amount) 
        
    # Note: build_hierarchy uses raw balances (Credit - Debit).
    # Assets e.g. Cash: Dr 1000. Balance = -1000. Display 1000.
    
    total_assets = sum(l.amount for l in assets)
    total_liabilities = sum(l.amount for l in liabilities)
    total_equity = sum(l.amount for l in equity)
    
    return {
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "total_equity": total_equity
    }

@router.get("/ledger", response_model=LedgerStatementResponse)
def get_ledger_statement(
    account_id: int,
    start_date: date = None,
    end_date: date = None,
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    # Opening Balance
    opening_query = db.query(func.sum(JournalLine.debit - JournalLine.credit)).join(JournalEntry).filter(JournalLine.account_id == account_id)
    if start_date:
        opening_query = opening_query.filter(JournalEntry.date < start_date)
    
    # Dr - Cr > 0 in default view
    opening_bal = opening_query.scalar() or 0.0
    
    # Running Balance logic
    entries_query = db.query(JournalLine, JournalEntry).join(JournalEntry).filter(JournalLine.account_id == account_id).order_by(JournalEntry.date, JournalEntry.id)
    
    if start_date:
        entries_query = entries_query.filter(JournalEntry.date >= start_date)
    if end_date:
        entries_query = entries_query.filter(JournalEntry.date <= end_date)
        
    results = []
    current_bal = opening_bal
    
    for line, entry in entries_query.all():
        net = line.debit - line.credit
        current_bal += net
        
        results.append(LedgerEntry(
            date=entry.date,
            voucher_number=entry.voucher_number or f"V-{entry.id}",
            particulars=entry.narration or "Transaction", # Ideally show contra account name here
            debit=line.debit,
            credit=line.credit,
            balance=current_bal
        ))
        
    return {
        "account_name": account.name,
        "opening_balance": opening_bal,
        "entries": results,
        "closing_balance": current_bal
    }
