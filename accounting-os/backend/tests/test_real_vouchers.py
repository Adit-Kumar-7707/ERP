from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry, JournalLine
from app.modules.vouchers.models import VoucherType, VoucherEntry, VoucherLineItem
from app.db.session import get_db

# Reuse logic or import from hardening test? Let's just create fresh isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_real_vouchers.db"
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
    
    # 1. Accounts
    sales_acc = Account(name="Sales Account", code="SAL001", type=AccountType.INCOME)
    party_acc = Account(name="Customer A", code="CUST001", type=AccountType.ASSET) # Sundry Debtor is Asset
    bank_acc = Account(name="Bank", code="BNK001", type=AccountType.ASSET)
    
    db.add_all([sales_acc, party_acc, bank_acc])
    db.commit()
    
    # 2. Financial Year (Needed for validation)
    fy = FinancialYear(name="FY 2024-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    db.add(fy)
    
    # 3. Voucher Types
    vt_sales = VoucherType(name="Sales Invoice", type_group="Sales", prefix="INV")
    vt_purc = VoucherType(name="Purchase Bill", type_group="Purchase", prefix="BILL")
    db.add_all([vt_sales, vt_purc])
    
    db.commit()
    
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_create_real_sales_voucher(test_db):
    """Test creating a Real Sales Voucher with Items"""
    vt = test_db.query(VoucherType).filter_by(name="Sales Invoice").first()
    sales_acc = test_db.query(Account).filter_by(name="Sales Account").first()
    party_acc = test_db.query(Account).filter_by(name="Customer A").first()
    
    payload = {
        "voucher_type_id": vt.id,
        "date": "2024-06-01",
        "party_ledger_id": party_acc.id,
        "narration": "Test Real Sales",
        "items": [
            {
                "ledger_id": sales_acc.id,
                "description": "Item A",
                "qty": 2,
                "rate": 100,
                "amount": 200 # Optional, assumed calc by backend
            },
            {
                "ledger_id": sales_acc.id,
                "description": "Item B",
                "qty": 1,
                "rate": 500,
                "amount": 500
            }
        ],
        "charges": []
    }
    
    response = client.post("/api/v1/vouchers/entries", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["total_amount"] == 700.0
    assert "INV/2024-25/" in data["voucher_number"]
    
    # Verify DB Postings
    # 1. Check VoucherEntry
    ve_id = data["id"]
    ve = test_db.query(VoucherEntry).filter_by(id=ve_id).first()
    assert ve.total_amount == 700
    assert len(ve.items) == 2
    
    # 2. Check JournalEntry (The Core Accounting)
    je = ve.journal_entry
    assert je is not None
    assert je.voucher_type == "Sales Invoice"
    
    # 3. Check Journal Lines
    # Should have: Dr Party 700, Cr Sales 200, Cr Sales 500
    lines = je.lines
    assert len(lines) == 3
    
    dr_line = [l for l in lines if l.debit > 0][0]
    assert dr_line.account_id == party_acc.id
    assert dr_line.debit == 700.0
    
    cr_lines = [l for l in lines if l.credit > 0]
    assert len(cr_lines) == 2
    assert sum(l.credit for l in cr_lines) == 700.0
    
def test_create_voucher_missing_party(test_db):
    vt = test_db.query(VoucherType).filter_by(name="Sales Invoice").first()
    
    payload = {
        "voucher_type_id": vt.id,
        "date": "2024-06-01",
        # Missing party_ledger_id
        "items": [{"ledger_id": 1, "qty": 1, "rate": 10}]
    }
    response = client.post("/api/v1/vouchers/entries", json=payload)
    assert response.status_code == 400
    assert "Party Ledger is required" in response.json()["detail"]
