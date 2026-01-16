from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry, JournalLine
from app.modules.vouchers.models import VoucherType
from app.modules.organization.models import Organization
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_reporting.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Setup Accounts with Hierarchy
    assets = Account(name="Assets", code="AST", type=AccountType.ASSET, is_group=True)
    liab = Account(name="Liabilities", code="LIA", type=AccountType.LIABILITY, is_group=True)
    equity = Account(name="Equity", code="EQ", type=AccountType.EQUITY, is_group=True)
    income = Account(name="Income", code="INC", type=AccountType.INCOME, is_group=True)
    expense = Account(name="Expenses", code="EXP", type=AccountType.EXPENSE, is_group=True)
    
    db.add_all([assets, liab, equity, income, expense])
    db.commit()
    
    bank = Account(name="Bank", code="BANK", type=AccountType.ASSET, parent_id=assets.id)
    capital = Account(name="Capital", code="CAP", type=AccountType.EQUITY, parent_id=equity.id)
    sales = Account(name="Sales", code="SALES", type=AccountType.INCOME, parent_id=income.id)
    rent = Account(name="Rent", code="RENT", type=AccountType.EXPENSE, parent_id=expense.id)
    tax_pay = Account(name="Tax Payable", code="TAX", type=AccountType.LIABILITY, parent_id=liab.id)
    
    db.add_all([bank, capital, sales, rent, tax_pay])
    db.commit()
    
    # 2. Setup Transactions
    # 2.1 Opening Balance: Capital Info Bank
    # Dr Bank 10000, Cr Capital 10000
    je1 = JournalEntry(date=date(2024, 4, 1), voucher_type="Journal", reference="OB-01", narration="Opening")
    db.add(je1)
    db.flush()
    db.add(JournalLine(entry_id=je1.id, account_id=bank.id, debit=10000, credit=0))
    db.add(JournalLine(entry_id=je1.id, account_id=capital.id, debit=0, credit=10000))
    
    # 2.2 Sales: 1000 + 180 Tax
    # Dr Bank 1180, Cr Sales 1000, Cr Tax 180
    je2 = JournalEntry(date=date(2024, 4, 5), voucher_type="Sales", reference="INV-01", narration="Sale")
    db.add(je2)
    db.flush()
    db.add(JournalLine(entry_id=je2.id, account_id=bank.id, debit=1180, credit=0))
    db.add(JournalLine(entry_id=je2.id, account_id=sales.id, debit=0, credit=1000))
    db.add(JournalLine(entry_id=je2.id, account_id=tax_pay.id, debit=0, credit=180))
    
    # 2.3 Expense: Rent 500
    # Dr Rent 500, Cr Bank 500
    je3 = JournalEntry(date=date(2024, 4, 10), voucher_type="Payment", reference="PAY-01", narration="Rent")
    db.add(je3)
    db.flush()
    db.add(JournalLine(entry_id=je3.id, account_id=rent.id, debit=500, credit=0))
    db.add(JournalLine(entry_id=je3.id, account_id=bank.id, debit=0, credit=500))
    
    db.commit()
    
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_trial_balance(test_db):
    res = client.get("/api/v1/reports/trial-balance?as_of=2024-12-31")
    assert res.status_code == 200
    tree = res.json()
    
    # Validate Root Nodes
    # We expect tree structure. 
    # Let's sum all "total_balance" of roots? No, Assets is Dr (+), Liab is Cr (-).
    # Sum should be 0.
    
    net_total = sum(node["total_balance"] for node in tree)
    assert abs(net_total) < 0.01 # Float precision
    
    # Check Bank Balance
    # Locate Assets -> Bank
    assets = next(n for n in tree if n["code"] == "AST")
    bank = next(n for n in assets["children"] if n["code"] == "BANK")
    # Bank Open 10000 + Sale 1180 - Rent 500 = 10680
    assert bank["total_balance"] == 10680.0

def test_profit_and_loss(test_db):
    res = client.get("/api/v1/reports/profit-and-loss?from_date=2024-04-01&to_date=2025-03-31")
    assert res.status_code == 200
    data = res.json()
    
    # Income: 1000 (Sales)
    assert data["total_income"] == 1000.0
    
    # Expense: 500 (Rent)
    assert data["total_expense"] == 500.0
    
    # Net Profit: 500
    assert data["net_profit"] == 500.0

def test_balance_sheet(test_db):
    res = client.get("/api/v1/reports/balance-sheet?as_of=2024-12-31")
    assert res.status_code == 200
    data = res.json()
    
    # Assets: 10680 (Bank)
    assert data["total_assets"] == 10680.0
    
    # Liabilities: 180 (Tax)
    assert data["total_liabilities"] == 180.0
    
    # Equity: 10000 (Capital)
    assert data["total_equity"] == 10000.0
    
    # Current Earnings: 500 (Profit)
    assert data["current_earnings"] == 500.0
    
    # Balance Check
    # Assets (10680) = Liab (180) + Eq (10000) + Earn (500)
    assert data["check"] == 0.0

def test_ledger_statement(test_db):
    # Get Bank ID
    bank_id = test_db.query(Account).filter_by(code="BANK").first().id
    
    # Test Full Range
    res = client.get(f"/api/v1/reports/ledger/{bank_id}?from_date=2024-04-01&to_date=2025-03-31")
    assert res.status_code == 200
    data = res.json()
    
    assert data["account_id"] == bank_id
    assert data["opening_balance"] == 0.0 # Started clean on 4-1
    assert data["closing_balance"] == 10680.0
    
    txns = data["transactions"]
    assert len(txns) == 3
    # Check running balance for last txn
    assert txns[-1]["running_balance"] == 10680.0
