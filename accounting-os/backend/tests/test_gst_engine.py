from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry
from app.modules.vouchers.models import VoucherType, VoucherEntry
from app.modules.inventory.models import StockItem, StockGroup, UnitOfMeasure
from app.modules.organization.models import Organization
from app.modules.gst.models import TaxRate, ItemTaxConfig
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_gst.db"
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
    
    # 1. Setup Organization (MH)
    org = Organization(name="My Company", state_code="27", gstin="27AAAAA0000A1Z5")
    db.add(org)
    
    # 2. Setup Accounts
    sales_acc = Account(name="Sales", code="SAL", type=AccountType.INCOME)
    party_local = Account(name="Local Customer", code="CUST_MH", type=AccountType.ASSET, state_code="27")
    party_inter = Account(name="Inter Customer", code="CUST_KA", type=AccountType.ASSET, state_code="29") # Karnataka
    
    db.add_all([sales_acc, party_local, party_inter])
    
    # 3. Setup Tax Rates
    # Seeding manually for test isolation
    rate_18 = TaxRate(name="GST 18%", rate_percent=18, cgst_percent=9, sgst_percent=9, igst_percent=18)
    db.add(rate_18)
    db.commit() # Get ID
    
    # 4. Inventory
    uom = UnitOfMeasure(name="Nos", symbol="nos")
    grp = StockGroup(name="General")
    db.add_all([uom, grp])
    db.commit()
    
    item = StockItem(name="Widget 18%", group_id=grp.id, uom_id=uom.id)
    db.add(item)
    db.commit()
    
    # Link Tax
    config = ItemTaxConfig(stock_item_id=item.id, tax_rate_id=rate_18.id)
    db.add(config)
    db.commit()
    
    # 5. Voucher Type & FY
    fy = FinancialYear(name="FY 24-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    vt_sales = VoucherType(name="Sales Invoice", type_group="Sales", sequence_type="manual")
    db.add_all([fy, vt_sales])
    db.commit()
    
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_intra_state_gst(test_db):
    """Test Local Sale (CGST + SGST)"""
    vt = test_db.query(VoucherType).first()
    item = test_db.query(StockItem).first()
    party = test_db.query(Account).filter_by(code="CUST_MH").first()
    sales_acc = test_db.query(Account).filter_by(code="SAL").first()
    
    # Sell 10 @ 100 = 1000
    # Tax @ 18% = 180 (90 CGST + 90 SGST)
    payload = {
        "voucher_type_id": vt.id,
        "date": "2024-06-01",
        "voucher_number": "INV-001",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": sales_acc.id, "item_id": item.id, "description": "Test", "qty": 10, "rate": 100, "amount": 1000}
        ]
    }
    
    res = client.post("/api/v1/vouchers/entries", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    assert data["net_amount"] == 1000.0
    assert data["tax_amount"] == 180.0
    assert data["total_amount"] == 1180.0
    
    # Check Charges
    charges = data["charges"]
    c_map = {c["charge_type"]: c["amount"] for c in charges}
    assert c_map.get("CGST") == 90.0
    assert c_map.get("SGST") == 90.0
    assert "IGST" not in c_map

def test_inter_state_gst(test_db):
    """Test Inter-State Sale (IGST)"""
    vt = test_db.query(VoucherType).first()
    item = test_db.query(StockItem).first()
    party = test_db.query(Account).filter_by(code="CUST_KA").first() # Karnataka
    sales_acc = test_db.query(Account).filter_by(code="SAL").first()
    
    payload = {
        "voucher_type_id": vt.id,
        "date": "2024-06-02",
        "voucher_number": "INV-002",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": sales_acc.id, "item_id": item.id, "description": "Test Inter", "qty": 10, "rate": 100, "amount": 1000}
        ]
    }
    
    res = client.post("/api/v1/vouchers/entries", json=payload)
    assert res.status_code == 200
    data = res.json()
    
    charges = data["charges"]
    c_map = {c["charge_type"]: c["amount"] for c in charges}
    assert c_map.get("IGST") == 180.0
    assert "CGST" not in c_map
    
    # Verify Journal Lines
    je = test_db.query(JournalEntry).filter_by(reference="INV-002").first()
    lines = je.lines
    # Dr Party 1180, Cr Sales 1000, Cr Output IGST 180
    assert len(lines) >= 3 # Includes Inventory lines from Part 3 logic
    
    igst_line = [l for l in lines if l.description == "IGST"][0]
    assert igst_line.credit == 180.0
