from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest
import io

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry
from app.modules.organization.models import Organization
from app.modules.auth.models import User, UserRole
from app.modules.migration.models import ImportBatch, ImportStatus
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_migration.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_active_user():
    return User(id=1, email="migrator@example.com", is_active=True, role=UserRole.OWNER)

app.dependency_overrides[get_db] = override_get_db
from app.modules.auth import deps
app.dependency_overrides[deps.get_current_active_user] = override_get_current_active_user

@pytest.fixture(scope="module")
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Setup
    org = Organization(name="Migrate Corp", is_deleted=False)
    db.add(org)
    
    fy = FinancialYear(name="FY 24-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    db.add(fy)
    
    # Root Groups
    assets = Account(name="Assets", code="AST", type=AccountType.ASSET, is_group=True)
    liab = Account(name="Liabilities", code="LIA", type=AccountType.LIABILITY, is_group=True)
    db.add_all([assets, liab])
    
    # Mock User
    user = User(id=1, email="migrator@example.com", hashed_password="pw", is_active=True)
    db.add(user)
    
    db.commit()
    yield db
    # Base.metadata.drop_all(bind=engine) # Keep for debug if fail

client = TestClient(app)

def test_balanced_import(test_db):
    csv_content = """Name,Group,Debit,Credit
Bank HDFC,Assets,1000,0
Capital,Liabilities,0,1000
"""
    file = {"file": ("data.csv", io.BytesIO(csv_content.encode('utf-8')))}
    
    res = client.post("/api/v1/import/excel", files=file)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Success"
    assert data["records"] == 2
    
    # Verify DB
    bank = test_db.query(Account).filter_by(name="Bank HDFC").first()
    assert bank is not None
    assert bank.parent.name == "Assets"
    
    # Verify JE
    je = test_db.query(JournalEntry).filter_by(reference="OB-IMPORT").first()
    assert je is not None
    assert je.is_opening is True

def test_unbalanced_import(test_db):
    csv_content = """Name,Group,Debit,Credit
Bank HDFC 2,Assets,1000,0
Capital 2,Liabilities,0,900
"""
    file = {"file": ("bad_data.csv", io.BytesIO(csv_content.encode('utf-8')))}
    
    res = client.post("/api/v1/import/excel", files=file)
    # Should be 200 (handled error) or 400? Service raises HTTPException 400 on error blocks? 
    # Logic: "If has_error... return ... errors". 
    # Actually logic returns dict if has_error. 
    # Let's check logic:
    # "return {'status': 'Failed', ...}" inside `process_excel_import` returns normally (200 OK with error payload) or Exception?
    # Logic `if has_error: ... return ...` implies 200 OK.
    
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "Failed"
    assert "Trial Balance Mismatch" in str(data["errors"])

def test_missing_group(test_db):
    csv_content = """Name,Group,Debit,Credit
Unknown,AlienGroup,100,0
"""
    file = {"file": ("missing.csv", io.BytesIO(csv_content.encode('utf-8')))}
    
    res = client.post("/api/v1/import/excel", files=file)
    assert res.status_code == 400 # Exception raised
    assert "Group 'AlienGroup' not found" in res.json()["detail"]
