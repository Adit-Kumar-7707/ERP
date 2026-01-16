from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry, JournalLine
from app.modules.vouchers.models import VoucherType, VoucherEntry
from app.modules.accounting.service import close_financial_year
from app.db.session import get_db

# Logic to override DB for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_hardening.db"
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
    
    # Clean
    db.query(JournalLine).delete()
    db.query(JournalEntry).delete()
    db.query(VoucherEntry).delete()
    db.query(VoucherType).delete()
    db.query(FinancialYear).delete()
    db.query(Account).delete()
    db.commit()
    
    # Seed Data
    # 1. Accounts
    income = Account(name="Sales", code="SAL01", type=AccountType.INCOME)
    expense = Account(name="Rent", code="EXP01", type=AccountType.EXPENSE)
    retained = Account(name="Retained Earnings", code="EQ01", type=AccountType.EQUITY)
    bank = Account(name="Bank", code="AST01", type=AccountType.ASSET)
    
    db.add_all([income, expense, retained, bank])
    db.commit()
    
    # 2. Financial Year
    fy = FinancialYear(name="FY 2024-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True, is_closed=False)
    db.add(fy)
    db.commit()
    
    # 3. Voucher Type
    vtype = VoucherType(name="Sales", type_group="Sales", sequence_type="automatic", prefix="INV", current_sequence=1)
    db.add(vtype)
    db.commit()
    
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_create_voucher_valid_fy(test_db):
    """Test creating voucher in valid FY period"""
    vtype = test_db.query(VoucherType).first()
    acc = test_db.query(Account).first()
    
    payload = {
        "voucher_type_id": vtype.id,
        "date": "2024-05-15", # Valid
        "narration": "Test Entry",
        "voucher_number": None,
        "lines": [
            {"account_id": acc.id, "debit": 1000, "credit": 0},
            {"account_id": acc.id, "debit": 0, "credit": 1000}
        ]
    }
    
    response = client.post("/api/v1/vouchers/entries", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "INV/2024-25/0001" in data["voucher_number"] # Check format

def test_create_voucher_invalid_date(test_db):
    """Test creating voucher outside defined FY"""
    vtype = test_db.query(VoucherType).first()
    acc = test_db.query(Account).first()
    
    payload = {
        "voucher_type_id": vtype.id,
        "date": "2022-01-01", # Way outside
        "lines": [{"account_id": acc.id, "debit": 100, "credit": 0}, {"account_id": acc.id, "debit": 0, "credit": 100}]
    }
    response = client.post("/api/v1/vouchers/entries", json=payload)
    assert response.status_code == 400
    assert "No Financial Year" in response.json()["detail"]

def test_close_financial_year(test_db):
    """Test closing the FY and checking P&L transfer"""
    fy = test_db.query(FinancialYear).first()
    
    # Close it using Service function directly (or endpoint if exists)
    # We'll use service function since endpoint might not be exposed yet
    entry_id = close_financial_year(test_db, fy.id)
    
    assert entry_id is not None
    test_db.refresh(fy)
    assert fy.is_closed == True
    
    # Verify Closing Entry
    entry = test_db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    assert entry.is_system_entry == True
    assert entry.narration == f"Year End Closing Entry - {fy.name}"

def test_post_in_closed_year_fail(test_db):
    """Test posting in a closed year fails"""
    vtype = test_db.query(VoucherType).first()
    acc = test_db.query(Account).first()
    
    payload = {
        "voucher_type_id": vtype.id,
        "date": "2024-12-01", # Inside valid dates but FY is now closed
        "lines": [{"account_id": acc.id, "debit": 100, "credit": 0}, {"account_id": acc.id, "debit": 0, "credit": 100}]
    }
    response = client.post("/api/v1/vouchers/entries", json=payload)
    assert response.status_code == 400
    assert "is Closed" in response.json()["detail"]
