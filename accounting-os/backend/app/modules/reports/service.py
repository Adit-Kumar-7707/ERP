from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from typing import List, Dict, Optional, Any
from datetime import date
from collections import defaultdict

from app.modules.accounting.models import Account, AccountType, JournalLine, JournalEntry

def get_ledger_balance(db: Session, account_id: int, from_date: Optional[date] = None, to_date: Optional[date] = None, as_of: Optional[date] = None) -> float:
    """
    Returns Net Balance (Dr - Cr) for an account.
    Positive = Debit Balance (Asset/Expense normal)
    Negative = Credit Balance (Liability/Income normal)
    """
    query = db.query(
        func.sum(JournalLine.debit).label("total_debit"),
        func.sum(JournalLine.credit).label("total_credit")
    ).join(JournalEntry)
    
    filters = [JournalLine.account_id == account_id]
    
    if from_date:
        filters.append(JournalEntry.date >= from_date)
    if to_date:
        filters.append(JournalEntry.date <= to_date)
    if as_of:
        filters.append(JournalEntry.date <= as_of)
        
    result = query.filter(*filters).first()
    
    dr = result.total_debit or 0.0
    cr = result.total_credit or 0.0
    
    return dr - cr

def build_account_tree(accounts: List[Account], balances: Dict[int, float]) -> List[Dict]:
    """
    Recursively builds account tree with summed balances.
    """
    # 1. Map ID -> Node
    nodes = {}
    for acc in accounts:
        nodes[acc.id] = {
            "id": acc.id,
            "name": acc.name,
            "type": acc.type,
            "parent_id": acc.parent_id,
            "is_group": acc.is_group,
            "balance": balances.get(acc.id, 0.0), # Net Dr - Cr
            "children": []
        }
        
    # 2. Build Tree
    forest = []
    
    # We need to process from leaf up or just link?
    # Simple linking loop
    # But for Group Totals, we need recursion (post-order traversal).
    
    # Better approach: Just link first
    for acc in accounts:
        node = nodes[acc.id]
        if node["parent_id"] and node["parent_id"] in nodes:
            parent = nodes[node["parent_id"]]
            parent["children"].append(node)
        else:
            forest.append(node)
            
    # 3. Sum Up Balances (Recursive)
    def aggregate(node):
        total = node["balance"]
        for child in node["children"]:
            total += aggregate(child)
        node["total_balance"] = total
        # Format for Frontend: Debit is +ve, Credit is -ve usually.
        # But for Display:
        # Asset/Expense: Show Dr.
        # Liability/Income: Show Cr (as positive number typically in Tally).
        # We'll return raw signed float, let UI format.
        return total
        
    for root in forest:
        aggregate(root)
        
    return forest

def get_trial_balance(db: Session, as_of_date: date):
    """
    Returns Hierarchical Trial Balance.
    """
    # 1. Get All Accounts
    accounts = db.query(Account).all()
    
    # 2. Get Balances for all accounts (Bulk Query)
    # Group by account_id
    query = db.query(
        JournalLine.account_id,
        func.sum(JournalLine.debit).label("dr"),
        func.sum(JournalLine.credit).label("cr")
    ).join(JournalEntry).filter(
        JournalEntry.date <= as_of_date
    ).group_by(JournalLine.account_id)
    
    balances = {}
    for aid, dr, cr in query.all():
        balances[aid] = (dr or 0.0) - (cr or 0.0)
        
    # 3. Build Tree
    # Note: balances only has Leaf Ledgers involved in transactions.
    # Group accounts might not have direct postings (should strictly not, but model allows).
    
    tree = build_account_tree(accounts, balances)
    return tree

def get_profit_and_loss(db: Session, from_date: date, to_date: date):
    """
    Returns P&L Structure.
    Net Profit = Income - Expenses.
    """
    # 1. Get Income & Expense Accounts
    # Optimize: reuse get_trial_balance logic but filter roots?
    # Re-impl for specific structure.
    
    query = db.query(
        JournalLine.account_id,
        func.sum(JournalLine.debit).label("dr"),
        func.sum(JournalLine.credit).label("cr")
    ).join(JournalEntry).filter(
        and_(JournalEntry.date >= from_date, JournalEntry.date <= to_date)
    ).group_by(JournalLine.account_id)
    
    raw_balances = {}
    for aid, dr, cr in query.all():
        raw_balances[aid] = (dr or 0.0) - (cr or 0.0)
        
    accounts = db.query(Account).filter(
        Account.type.in_([AccountType.INCOME, AccountType.EXPENSE])
    ).all()
    
    tree = build_account_tree(accounts, raw_balances)
    
    # Separate Income and Expense Roots
    income_nodes = [n for n in tree if n["type"] == AccountType.INCOME.value]
    expense_nodes = [n for n in tree if n["type"] == AccountType.EXPENSE.value]
    
    total_income = sum(n["total_balance"] for n in income_nodes) * -1 # Income is Credit (-ve), flip to positive for display
    total_expense = sum(n["total_balance"] for n in expense_nodes) # Expense is Debit (+ve)
    
    net_profit = total_income - total_expense
    
    return {
        "income": income_nodes,
        "expense": expense_nodes,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": net_profit
    }

def get_balance_sheet(db: Session, as_of_date: date):
    """
    Returns Balance Sheet.
    Assets = Liabilities + Equity.
    Needs P&L (opening + current period) added to Equity.
    """
    # 1. Calculate Current P&L (From Beginning of time? Or Open FY?)
    # Usually BS is "As Of". Earnings = Income - Expense (All Time, or YTD if Retained Earnings moved?)
    # Simplified: Income - Expense (All Time) is the Retained Earnings if not closed.
    # If we have "Closing Entries", then Income/Expense resets.
    # Assuming Part 1 Closing system handles this or we compute dynamic.
    # Let's compute dynamic "Current Earnings" for simplicity if closing not fully enforced.
    
    # Fetch Balances for ALL accounts up to date
    query = db.query(
        JournalLine.account_id,
        func.sum(JournalLine.debit).label("dr"),
        func.sum(JournalLine.credit).label("cr")
    ).join(JournalEntry).filter(
        JournalEntry.date <= as_of_date
    ).group_by(JournalLine.account_id)
    
    balances = {}
    for aid, dr, cr in query.all():
        balances[aid] = (dr or 0.0) - (cr or 0.0)
        
    all_accounts = db.query(Account).all()
    tree = build_account_tree(all_accounts, balances)
    
    assets = [n for n in tree if n["type"] == AccountType.ASSET.value]
    liabilities = [n for n in tree if n["type"] == AccountType.LIABILITY.value]
    equity = [n for n in tree if n["type"] == AccountType.EQUITY.value]
    income = [n for n in tree if n["type"] == AccountType.INCOME.value]
    expense = [n for n in tree if n["type"] == AccountType.EXPENSE.value]
    
    total_assets = sum(n["total_balance"] for n in assets)
    total_liabilities = sum(n["total_balance"] for n in liabilities) * -1 # Cr is -ve
    total_equity = sum(n["total_balance"] for n in equity) * -1 # Cr is -ve
    
    current_earnings = (sum(n["total_balance"] for n in income) + sum(n["total_balance"] for n in expense)) * -1
    # Note: Income is -ve, Expense is +ve. Sum = Net Loss (if +ve) or Net Profit (if -ve).
    # Multiplied by -1 -> Positive Profit.
    
    return {
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "total_equity": total_equity,
        "current_earnings": current_earnings,
        "check": total_assets - (total_liabilities + total_equity + current_earnings) # Should be 0
    }

def get_ledger_statement(db: Session, account_id: int, from_date: date, to_date: date, skip: int = 0, limit: int = 100):
    """
    Returns Opening Balance, Transactions, Closing Balance.
    """
    # 1. Opening Balance (Before from_date)
    ob_query = db.query(
        func.sum(JournalLine.debit),
        func.sum(JournalLine.credit)
    ).join(JournalEntry).filter(
        and_(JournalLine.account_id == account_id, JournalEntry.date < from_date)
    )
    ob_dr, ob_cr = ob_query.first()
    opening_balance = (ob_dr or 0.0) - (ob_cr or 0.0)
    
    # 2. Running Balance Adjustment (Pre-Skip)
    # If we skip rows, we need the running balance up to the skip point.
    # Calculate sum of transactions in [from_date, from_date + skip transactions) ?
    # Or just fetch all Previous Transactions in range?
    # Optimal: Calculate Balance of (OB + Balances in Range Before Skip).
    
    # Query for "Skipped" transactions sum
    pre_skip_balance = 0.0
    if skip > 0:
        # We need sum of top 'skip' rows ordered by date.
        # This is complex in SQL without Window Functions easily on all DBs, but doable.
        # Simplification: Calculate total balance up to (limit+skip) locally? No, defeats pagination if 1M rows.
        # Strategy:
        # Running Balance is tricky with pagination.
        # Option A: Frontend calculates Running Balance (We send OB + List).
        # Option B: We calculate "Balance at Start of Page".
        
        # Calculate Balance from [from_date] to [skip rows].
        # Subquery limit?
        # Let's assume Option A is often better for infinite scroll, but Tally shows running balance.
        # Let's compute "Opening Balance for this Page".
        
        # Sum of (Dr-Cr) for lines in range, with limit=skip.
        # But order matters.
        # We need the ordered set.
        
        # For now, let's keep it simple: Calculate Total Balance before page?
        # Actually Tally usually loads all or partitions by month. 
        # Large Data Requirement: Pagination.
        # I will implement basic pagination. Running Balance might be "Page Relative" or we try to compute absolute.
        pass

    # 2. Transactions (Paginated)
    query = db.query(JournalLine).join(JournalEntry).filter(
        and_(JournalLine.account_id == account_id, JournalEntry.date >= from_date, JournalEntry.date <= to_date)
    ).order_by(JournalEntry.date, JournalEntry.id)
    
    total_count = query.count()
    lines = query.offset(skip).limit(limit).all()
    
    transactions = []
    # If we want absolute running balance, we need (OB + Sum of all previous lines).
    # Heavy query: Sum where date < current line date? 
    # Optimization: Calculate (OB + Sum of lines < offset).
    
    pre_page_sum = 0.0
    if skip > 0:
        # Limit sum calculation?
        # Or Just use Window Function in DB?
        pass 
        # For MVP Large Data: Just return transactions. UI can sum if needed or we fix Running Balance later.
        # Actually, "Running Balance" is critical.
        # Let's simple-sum all lines before offset.
        
        pre_query = db.query(
            func.sum(JournalLine.debit), 
            func.sum(JournalLine.credit)
        ).join(JournalEntry).filter(
            and_(JournalLine.account_id == account_id, JournalEntry.date >= from_date, JournalEntry.date <= to_date)
        ).order_by(JournalEntry.date, JournalEntry.id).limit(skip) 
        # Limit on Aggregate is not valid standard SQL without subquery.
        
        # Correct approach: Subquery for IDs in top skip.
        sub = db.query(JournalLine.id).join(JournalEntry).filter(
            and_(JournalLine.account_id == account_id, JournalEntry.date >= from_date, JournalEntry.date <= to_date)
        ).order_by(JournalEntry.date, JournalEntry.id).limit(skip).subquery()
        
        pre_agg = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit)).filter(JournalLine.id.in_(sub)).first()
        pre_page_sum = (pre_agg[0] or 0) - (pre_agg[1] or 0)

    running = opening_balance + pre_page_sum
    
    for l in lines:
        amount = l.debit - l.credit
        running += amount
        transactions.append({
            "date": l.entry.date,
            "voucher_no": l.entry.reference, # or ID
            "voucher_id": l.entry.id,
            "voucher_type": l.entry.voucher_type,
            "description": l.description or l.entry.narration,
            "debit": l.debit,
            "credit": l.credit,
            "running_balance": running
        })
        
    return {
        "account_id": account_id,
        "opening_balance": opening_balance,
        "closing_balance": running, # This is closing of result set. True closing needs full query.
        "transactions": transactions,
        "total_count": total_count,
        "skip": skip,
        "limit": limit
    }
