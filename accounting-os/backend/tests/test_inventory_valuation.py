from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import pytest

from app.main import app
from app.db.base import Base
from app.modules.accounting.models import FinancialYear, Account, AccountType, JournalEntry, JournalLine
from app.modules.vouchers.models import VoucherType, VoucherEntry
from app.modules.inventory.models import StockItem, StockGroup, UnitOfMeasure, StockLedgerEntry
from app.db.session import get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_inventory.db"
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
    sales_acc = Account(name="Sales", code="SAL", type=AccountType.INCOME)
    purc_acc = Account(name="Purchase", code="PURC", type=AccountType.EXPENSE)
    party_acc = Account(name="Customer", code="CUST", type=AccountType.ASSET)
    inv_acc = Account(name="Inventory Asset", code="INV", type=AccountType.ASSET)
    cogs_acc = Account(name="Cost of Goods Sold", code="COGS", type=AccountType.EXPENSE)
    
    db.add_all([sales_acc, purc_acc, party_acc, inv_acc, cogs_acc])
    db.commit()
    
    # 2. Financial Year
    fy = FinancialYear(name="FY 24-25", start_date=date(2024, 4, 1), end_date=date(2025, 3, 31), is_active=True)
    db.add(fy)
    
    # 3. Voucher Types
    vt_sales = VoucherType(name="Sales", type_group="Sales", sequence_type="manual")
    vt_purc = VoucherType(name="Purchase", type_group="Purchase", sequence_type="manual")
    db.add_all([vt_sales, vt_purc])
    
    # 4. Inventory Masters
    uom = UnitOfMeasure(name="Nos", symbol="nos")
    grp = StockGroup(name="General")
    db.add_all([uom, grp])
    db.commit()
    
    item = StockItem(
        name="Test Item Widget",
        group_id=grp.id,
        uom_id=uom.id,
        valuation_method="AVG",
        inventory_account_id=inv_acc.id,
        cogs_account_id=cogs_acc.id
    )
    db.add(item)
    db.commit()
    
    yield db
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_inventory_flow(test_db):
    # Get IDs
    vt_purc = test_db.query(VoucherType).filter_by(name="Purchase").first()
    vt_sales = test_db.query(VoucherType).filter_by(name="Sales").first()
    item = test_db.query(StockItem).first()
    party = test_db.query(Account).filter_by(code="CUST").first()
    
    # 1. Purchase 10 @ 100
    p1 = {
        "voucher_type_id": vt_purc.id,
        "date": "2024-06-01",
        "voucher_number": "PURC001",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": party.id, "item_id": item.id, "description": "Buy 10", "qty": 10, "rate": 100, "amount": 1000}
        ]
    }
    client.post("/api/v1/vouchers/entries", json=p1)
    
    # Check Ledger
    sl_entries = test_db.query(StockLedgerEntry).all()
    assert len(sl_entries) == 1
    assert sl_entries[0].qty_in == 10
    assert sl_entries[0].value == 1000
    
    # 2. Purchase 10 @ 200
    p2 = {
        "voucher_type_id": vt_purc.id,
        "date": "2024-06-02",
        "voucher_number": "PURC002",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": party.id, "item_id": item.id, "description": "Buy 10 More", "qty": 10, "rate": 200, "amount": 2000}
        ]
    }
    client.post("/api/v1/vouchers/entries", json=p2)
    
    # Total Stock: 20 units. Total Value: 3000. Avg Rate = 150.
    
    # 3. Sell 5 Units
    # COGS should be 5 * 150 = 750.
    s1 = {
        "voucher_type_id": vt_sales.id,
        "date": "2024-06-05", # Date matters for AVG
        "voucher_number": "SALE001",
        "party_ledger_id": party.id,
        "items": [
            {"ledger_id": test_db.query(Account).filter_by(code="SAL").first().id, 
             "item_id": item.id, "description": "Sell 5", "qty": 5, "rate": 300, "amount": 1500}
        ]
    }
    res = client.post("/api/v1/vouchers/entries", json=s1)
    assert res.status_code == 200
    
    # Verify Stock Ledger
    # Should have 3 entries now.
    entries = test_db.query(StockLedgerEntry).filter(StockLedgerEntry.stock_item_id == item.id).all()
    assert len(entries) == 3
    
    out_entry = entries[2]
    assert out_entry.qty_out == 5
    assert out_entry.cost_value == 750.0 # Critical Assertion
    
    # Verify Journal Lines
    je_id = res.json()["journal_entry_id"]
    je = test_db.query(JournalEntry).filter_by(id=je_id).first()
    lines = je.lines
    
    # Should have: Dr Party 1500, Cr Sales 1500, Dr COGS 750, Cr Inv 750
    assert len(lines) == 4
    cogs_line = [l for l in lines if l.account.code == "COGS"][0]
    assert cogs_line.debit == 750.0
    
    inv_line = [l for l in lines if l.account.code == "INV"][0]
    assert inv_line.credit == 750.0

