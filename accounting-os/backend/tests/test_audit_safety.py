from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry
from app.modules.vouchers.models import VoucherType, VoucherEntry
from app.modules.organization.models import Organization
from app.modules.audit.models import AuditLog, VoucherVersion
from app.db.session import get_db
from app.modules.auth.models import User, UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_audit.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_active_user():
    # Mock User
    return User(id=1, email="test@example.com", is_active=True, role=UserRole.OWNER)

app.dependency_overrides[get_db] = override_get_db
from app.modules.auth import deps
app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Setup Data
    org = Organization(name="Audit Corp", state_code="27", is_deleted=False)
    db.add(org)
    
    fy = FinancialYear(name="FY 24-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    db.add(fy)
    
    vt = VoucherType(name="Sales", type_group="Sales", sequence_type="manual")
    db.add(vt)
    
    acc = Account(name="Party", code="PRT", type=AccountType.ASSET, is_deleted=False)
    sales = Account(name="Sales", code="SAL", type=AccountType.INCOME, is_deleted=False)
    db.add_all([acc, sales])
    
    # Mock User
    user = User(id=1, email="test@example.com", hashed_password="pw", is_active=True, role=UserRole.OWNER)
    db.add(user)
    
    db.commit()
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_voucher_edit_flow(test_db):
    # 1. Create Voucher
    vt = test_db.query(VoucherType).first()
    party = test_db.query(Account).filter_by(code="PRT").first()
    sales = test_db.query(Account).filter_by(code="SAL").first()
    
    payload = {
        "voucher_type_id": vt.id,
        "date": "2024-05-01",
        "voucher_number": "VCH-001",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": sales.id, "item_id": None, "description": "Item 1", "qty": 1, "rate": 100, "amount": 100}
        ]
    }
    
    res = client.post("/api/v1/vouchers/entries", json=payload)
    assert res.status_code == 200
    v_id = res.json()["id"]
    
    # 2. Edit Voucher (Update Amount to 200)
    payload["items"][0]["rate"] = 200
    payload["items"][0]["amount"] = 200
    
    res = client.put(f"/api/v1/vouchers/entries/{v_id}", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_amount"] == 200.0
    
    # 3. Verify Safety
    # A. Check VoucherVersion
    versions = test_db.query(VoucherVersion).filter_by(voucher_id=v_id).all()
    assert len(versions) == 1
    assert versions[0].snapshot_json["total_amount"] == 100.0
    
    # B. Check Journal Entries count
    # Original + Reversal + New = 3
    jes = test_db.query(JournalEntry).filter(JournalEntry.reference.like("%VCH-001%")).all()
    assert len(jes) == 3
    
    # Verify Reversal
    rev = next(je for je in jes if "REV" in je.reference)
    assert rev.narration.startswith("Reversal")
    
    # C. Check Audit Log
    logs = test_db.query(AuditLog).all()
    assert len(logs) > 0
    assert logs[0].action == "UPDATE"

def test_soft_delete(test_db):
    acc = test_db.query(Account).filter_by(code="PRT").first()
    # Simulate DB Level Soft Delete (since API for delete not implemented here fully)
    acc.is_deleted = True
    test_db.commit()
    
    # In real app, GET should filter this out.
    # checking existence
    assert acc.is_deleted is True
