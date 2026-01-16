from sqlalchemy.orm import Session
from datetime import date
from fastapi import HTTPException
from app.modules.accounting.models import FinancialYear, JournalEntry, JournalLine, Account, AccountType
from sqlalchemy import func

def get_financial_year_for_date(db: Session, entry_date: date) -> FinancialYear:
    """
    Finds the Financial Year that covers the given date.
    """
    fy = db.query(FinancialYear).filter(
        FinancialYear.start_date <= entry_date,
        FinancialYear.end_date >= entry_date
    ).first()
    return fy

def validate_entry_posting(db: Session, entry_date: date):
    """
    Validates if a voucher can be posted on this date.
    Rules:
    1. Must belong to an existing FY.
    2. FY must be Open (is_closed = False).
    3. Date must not be in a Locked Period.
    """
    # 1. FY Check
    fy = get_financial_year_for_date(db, entry_date)
    if not fy:
        raise HTTPException(status_code=400, detail=f"No Financial Year defined for date {entry_date}. Please create a Financial Year first.")
    
    # 2. Closed Check
    if fy.is_closed:
        raise HTTPException(status_code=400, detail=f"Financial Year {fy.name} is Closed. Cannot post entries.")
    
    # 3. Lock Check
    if fy.is_locked:
        # Full FY Lock
        raise HTTPException(status_code=400, detail=f"Financial Year {fy.name} is Locked.")
    
    if fy.locked_upto and entry_date <= fy.locked_upto:
         raise HTTPException(status_code=400, detail=f"Period is locked upto {fy.locked_upto}. Cannot post entries.")

    # 4. Books Beginning From Check (Tally Parity)
    # Fetch Organization Settings (Assuming Single Org ID 1 for now or via Context)
    from app.modules.organization.models import Organization
    org = db.query(Organization).first()
    if org and org.books_beginning_from and entry_date < org.books_beginning_from:
         raise HTTPException(status_code=400, detail=f"Cannot record entry before Books Beginning From date ({org.books_beginning_from}).")

    return fy

def close_financial_year(db: Session, fy_id: int) -> int:
    """
    Closes the financial year.
    1. Validate FY exists and is active.
    2. Calculate P&L: Income - Expenses.
    3. Post 'Transfer to Retained Earnings' Journal Entry (31st Mar).
    4. Mark FY as closed.
    5. Generate Opening Entries for Next FY (1st Apr).
    """
    fy = db.query(FinancialYear).filter(FinancialYear.id == fy_id).first()
    if not fy:
        raise HTTPException(status_code=404, detail="Financial Year not found")
        
    if fy.is_closed:
         raise HTTPException(status_code=400, detail="Financial Year is already closed")
         
    # --- Step 1: Calculate Net Profit ---
    # Sum(Credit - Debit) for Income
    income = db.query(func.sum(JournalLine.credit - JournalLine.debit))\
        .join(Account).join(JournalEntry)\
        .filter(JournalEntry.financial_year_id == fy.id)\
        .filter(Account.type == AccountType.INCOME)\
        .scalar() or 0.0
        
    # Sum(Debit - Credit) for Expense
    expense = db.query(func.sum(JournalLine.debit - JournalLine.credit))\
        .join(Account).join(JournalEntry)\
        .filter(JournalEntry.financial_year_id == fy.id)\
        .filter(Account.type == AccountType.EXPENSE)\
        .scalar() or 0.0
        
    net_profit = income - expense
    
    # --- Step 2: Post Transfer Entry ---
    # Find/Create "Retained Earnings" (Equity) account
    retained_earnings = db.query(Account).filter(Account.name == "Retained Earnings").first()
    if not retained_earnings:
        # Fallback or Error
        # For now, let's assume it exists or use Capital
        retained_earnings = db.query(Account).filter(Account.type == AccountType.EQUITY).first()
        if not retained_earnings:
             raise HTTPException(status_code=500, detail="No Equity account found to transfer profit.")
    
    # Find P&L Account? No, we transfer FROM temporary accounts TO Re.
    # Actually, in modern systems we just post ONE net entry OR a closure entry.
    # The standard is: Dr All Income, Cr All Expense, diff to Retained Earnings.
    # This "Zeroes out" Income/Expense.
    
    closing_lines = []
    
    # A. Zero out Income (Dr Income)
    income_accs = db.query(Account.id, func.sum(JournalLine.credit - JournalLine.debit).label('bal'))\
        .join(JournalEntry).join(JournalLine)\
        .filter(JournalEntry.financial_year_id == fy.id)\
        .filter(Account.type == AccountType.INCOME)\
        .group_by(Account.id).having(func.sum(JournalLine.credit - JournalLine.debit) != 0).all()
        
    for acc_id, bal in income_accs:
        # Balance is Credit positive. To zero, we Debit it.
        closing_lines.append(JournalLine(
            account_id=acc_id,
            debit=bal,
            credit=0,
            description="Closing Transfer"
        ))

    # B. Zero out Expense (Cr Expense)
    expense_accs = db.query(Account.id, func.sum(JournalLine.debit - JournalLine.credit).label('bal'))\
        .join(JournalEntry).join(JournalLine)\
        .filter(JournalEntry.financial_year_id == fy.id)\
        .filter(Account.type == AccountType.EXPENSE)\
        .group_by(Account.id).having(func.sum(JournalLine.debit - JournalLine.credit) != 0).all()
        
    for acc_id, bal in expense_accs:
        # Balance is Debit positive. To zero, we Credit it.
        closing_lines.append(JournalLine(
            account_id=acc_id,
            debit=0,
            credit=bal,
            description="Closing Transfer"
        ))
        
    # C. Difference to Retained Earnings
    # Total Dr so far (from Income zeroing) vs Total Cr (from Expense zeroing)
    total_dr = sum(l.debit for l in closing_lines)
    total_cr = sum(l.credit for l in closing_lines)
    
    diff = total_dr - total_cr
    
    # If Dr > Cr (More Income closed than Expense closed) -> Profit. 
    # We need to Credit Retained Earnings to balance.
    if diff > 0:
        closing_lines.append(JournalLine(
            account_id=retained_earnings.id,
            debit=0,
            credit=abs(diff),
            description=f"Net Profit Transfer FY {fy.name}"
        ))
    elif diff < 0:
        # Loss. We need to Debit Retained Earnings.
        closing_lines.append(JournalLine(
            account_id=retained_earnings.id,
            debit=abs(diff),
            credit=0,
            description=f"Net Loss Transfer FY {fy.name}"
        ))
        
    # Post Closing Voucher
    closing_entry = JournalEntry(
        date=fy.end_date,
        voucher_type="Journal",
        narration=f"Year End Closing Entry - {fy.name}",
        financial_year_id=fy.id,
        is_system_entry=True,
        is_locked=True,
        lines=closing_lines
    )
    db.add(closing_entry)
    
    # --- Step 3: Mark Closed ---
    fy.is_closed = True
    
    # --- Step 4: Create Next Year & Opening Balances ---
    # (Simplified: User creates Next FY manually or we auto create?)
    # Let's check if next FY exists
    # next_start = fy.end_date + 1 day
    # If exists, we post Opening Voucher there.
    
    # For now, we return, assuming Logic for Opening is handled when Next FY starts or explicitly requested.
    # Ideally, we should post it now if Next FY exists.
    
    # Commit
    db.commit()
    return closing_entry.id
