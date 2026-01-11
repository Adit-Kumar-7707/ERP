from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

# Import auth module deps
from app.modules.auth import deps
from app.modules.accounting.models import Account, JournalEntry, JournalLine
from app.modules.accounting.schemas import AccountCreate, Account as AccountSchema
from app.modules.accounting.schemas import JournalEntryCreate, JournalEntry as JournalEntrySchema

router = APIRouter()

# --- Accounts Endpoints ---
@router.get("/accounts", response_model=List[AccountSchema], tags=["accounts"])
def read_accounts(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve accounts.
    """
    accounts = db.query(Account).offset(skip).limit(limit).all()
    return accounts

@router.post("/accounts", response_model=AccountSchema, tags=["accounts"])
def create_account(
    *,
    db: Session = Depends(deps.get_db),
    account_in: AccountCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new account.
    """
    account = db.query(Account).filter(Account.code == account_in.code).first()
    if account:
        raise HTTPException(
            status_code=400,
            detail="The account with this code already exists in the system.",
        )
    account = Account(
        code=account_in.code,
        name=account_in.name,
        type=account_in.type,
        description=account_in.description,
        parent_id=account_in.parent_id,
        is_group=account_in.is_group,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account

# --- Journal Endpoints ---
@router.get("/journal", response_model=List[JournalEntrySchema], tags=["journal"])
def read_journal_entries(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Retrieve journal entries.
    """
    entries = db.query(JournalEntry).offset(skip).limit(limit).all()
    return entries

@router.post("/journal", response_model=JournalEntrySchema, tags=["journal"])
def create_journal_entry(
    *,
    db: Session = Depends(deps.get_db),
    entry_in: JournalEntryCreate,
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new journal entry.
    """
    # 1. Custom validation for accounts existence
    for line in entry_in.lines:
        account = db.query(Account).filter(Account.id == line.account_id).first()
        if not account:
             raise HTTPException(status_code=404, detail=f"Account with id {line.account_id} not found")

    # 3. Create objects
    db_entry = JournalEntry(
        date=entry_in.date,
        voucher_type=entry_in.voucher_type,
        reference=entry_in.reference,
        narration=entry_in.narration,
    )
    db.add(db_entry)
    db.commit() # Commit to get ID
    db.refresh(db_entry)

    for line in entry_in.lines:
        db_line = JournalLine(
            entry_id=db_entry.id,
            account_id=line.account_id,
            description=line.description,
            debit=line.debit,
            credit=line.credit,
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_entry)
    return db_entry

# --- Reports Endpoints ---
@router.get("/dashboard-stats", tags=["reports"])
def read_dashboard_stats(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Returns financial statistics (Cash, Bank, Receivables, Payables, Profit).
    """
    from sqlalchemy import func
    from app.modules.accounting.models import Account, AccountType, JournalLine, JournalEntry

    # Helper to get balance of an account type (Net Debit or Credit)
    # Assets/Expenses: Dr > Cr. Liabilities/Income: Cr > Dr.
    def get_type_balance(acc_type: str, is_debit_normal: bool = True):
        # Sum (Debit - Credit) for all accounts of this type
        query = db.query(
            func.sum(JournalLine.debit),
            func.sum(JournalLine.credit)
        ).join(Account).filter(Account.type == acc_type)
        
        dr, cr = query.first() or (0.0, 0.0)
        dr = dr or 0.0
        cr = cr or 0.0
        
        return (dr - cr) if is_debit_normal else (cr - dr)

    # 1. Cash (Cash-in-Hand is usually under 'Asset' with name containing Cash or explicit type)
    # For MVP, assuming accounts exist. We rely on string types stored in DB.
    # We might need to filter by name 'Cash%' if type is generic 'Asset'.
    # Let's try to query by name patterns or strict types from `seed.py`.
    # Seed data uses types: asset, liability, equity, income, expense.
    
    # Cash Balance (Assets named like 'Cash')
    cash_dr, cash_cr = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit))\
        .join(Account).filter(Account.type == AccountType.ASSET, Account.name.ilike('%Cash%')).first() or (0.0, 0.0)
    cash_bal = (cash_dr or 0) - (cash_cr or 0)

    # Bank Balance (Assets named like 'Bank')
    bank_dr, bank_cr = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit))\
        .join(Account).filter(Account.type == AccountType.ASSET, Account.name.ilike('%Bank%')).first() or (0.0, 0.0)
    bank_bal = (bank_dr or 0) - (bank_cr or 0)

    # Receivables (Assets under Sundry Debtors - usually generic Asset in simple seed, or filtered by parent group)
    # Assuming 'Debtors' or 'Receivable' in name
    rec_dr, rec_cr = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit))\
        .join(Account).filter(Account.type == AccountType.ASSET, Account.name.ilike('%Debtor%')).first() or (0.0, 0.0)
    receivables = (rec_dr or 0) - (rec_cr or 0)

    # Payables (Liabilities under Sundry Creditors)
    pay_dr, pay_cr = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit))\
        .join(Account).filter(Account.type == AccountType.LIABILITY, Account.name.ilike('%Creditor%')).first() or (0.0, 0.0)
    payables = (pay_cr or 0) - (pay_dr or 0)

    # Gross Profit = Sales - COGS. 
    # Simplified: Income - Expense (Trading).
    income = get_type_balance(AccountType.INCOME, is_debit_normal=False)
    expense = get_type_balance(AccountType.EXPENSE, is_debit_normal=True)
    gross_profit = income - expense
    
    # Margin
    margin = (gross_profit / income * 100) if income > 0 else 0.0

    # GST (Duties & Taxes). Filter Liabilities with GST name.
    gst_dr, gst_cr = db.query(func.sum(JournalLine.debit), func.sum(JournalLine.credit))\
        .join(Account).filter(Account.type == AccountType.LIABILITY, Account.name.ilike('%GST%')).first() or (0.0, 0.0)
    gst_payable = (gst_cr or 0)
    gst_credit = (gst_dr or 0)

    return {
        "cashBalance": cash_bal,
        "bankBalance": bank_bal,
        "receivables": receivables,
        "payables": payables,
        "grossProfit": gross_profit,
        "grossProfitMargin": round(margin, 1),
        "gstPayable": gst_payable,
        "gstCredit": gst_credit
    }

@router.get("/reports/trial-balance", tags=["reports"])
def get_trial_balance(
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate Trial Balance Report.
    """
    accounts = db.query(Account).all()
    report = []
    
    total_debit = 0.0
    total_credit = 0.0

    for account in accounts:
        # Sum debits and credits for this account
        debit_sum = db.query(func.sum(JournalLine.debit)).filter(JournalLine.account_id == account.id).scalar() or 0.0
        credit_sum = db.query(func.sum(JournalLine.credit)).filter(JournalLine.account_id == account.id).scalar() or 0.0
        
        balance = debit_sum - credit_sum
        
        report.append({
            "account_code": account.code,
            "account_name": account.name,
            "account_type": account.type,
            "debit": debit_sum,
            "credit": credit_sum,
            "net_balance": balance
        })
        
        total_debit += debit_sum
        total_credit += credit_sum

    return {
        "lines": report,
        "total_debit": total_debit,
        "total_credit": total_credit,
        "is_balanced": abs(total_debit - total_credit) < 0.01 
    }
