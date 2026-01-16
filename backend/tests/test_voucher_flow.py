import sys
import os
from datetime import date

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.db import Base
from app.modules.accounting.models import Organization, AccountGroup, Ledger, VoucherType, Voucher, VoucherEntry, BillAllocation
from app.modules.inventory.models import StockItem
from app.modules.vouchers.router import create_voucher, VoucherCreate, VoucherEntryCreate, BillAllocationCreate, update_voucher

# Setup Test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Seed Organization
    org = Organization(name="Test Org", financial_year_start=date(2024, 4, 1), books_beginning_from=date(2024, 4, 1))
    db.add(org)
    
    # 2. Seed Groups
    g_assets = AccountGroup(name="Assets", nature="Assets")
    g_liabilities = AccountGroup(name="Liabilities", nature="Liabilities")
    db.add(g_assets)
    db.add(g_liabilities)
    db.flush()
    
    g_debtors = AccountGroup(name="Sundry Debtors", parent_id=g_assets.id, nature="Assets")
    g_sales = AccountGroup(name="Sales Accounts", parent_id=g_assets.id, nature="Income") # Technically Income nature
    db.add(g_debtors)
    db.add(g_sales)
    db.flush()
    
    # 3. Seed Ledgers
    l_party = Ledger(name="Test Party", group_id=g_debtors.id)
    l_sales = Ledger(name="Sales A/c", group_id=g_sales.id)
    db.add(l_party)
    db.add(l_sales)
    
    # 4. Seed Voucher Type
    vt = VoucherType(name="Sales", nature="Sales", numbering_method="Automatic", numbering_prefix="INV/")
    db.add(vt)
    
    db.commit()
    return db, l_party.id, l_sales.id, vt.id

def test_voucher_lifecycle():
    print("--- Starting Voucher Lifecycle Test ---")
    db, party_id, sales_id, vtype_id = init_test_db()
    
    # A. Create Voucher with Bill Allocations
    print("Test A: Creating Voucher...")
    entries = [
        VoucherEntryCreate(
            ledger_id=party_id,
            amount=1050.0,
            is_debit=True,
            bill_allocations=[
                BillAllocationCreate(ref_type="New Ref", ref_name="INV/001", amount=1000.0, credit_period=date(2024, 5, 1)),
                BillAllocationCreate(ref_type="New Ref", ref_name="Delivery Chg", amount=50.0)
            ]
        ),
        VoucherEntryCreate(
            ledger_id=sales_id,
            amount=1050.0,
            is_debit=False
        )
    ]
    
    v_in = VoucherCreate(
        voucher_type_id=vtype_id,
        date=date(2024, 4, 10),
        voucher_number="", # Auto
        entries=entries
    )
    
    result = create_voucher(v_in, db)
    v_id = result["id"]
    print(f"Voucher Created: ID={v_id}, Number={result['number']}")
    
    # Verify Data
    v = db.query(Voucher).filter(Voucher.id == v_id).first()
    assert v.voucher_number == "INV/1"
    
    # Verify Allocations
    entry_party = next(e for e in v.entries if e.ledger_id == party_id)
    assert len(entry_party.bill_allocations) == 2
    assert entry_party.bill_allocations[0].ref_name == "INV/001"
    print("Validation A Passed: Voucher and Allocations persisted.")
    
    # B. Update Voucher (Modify Allocations)
    print("Test B: Updating Voucher...")
    # Change amount and allocations
    entries[0].amount = 1200.0
    entries[0].bill_allocations = [
        BillAllocationCreate(ref_type="New Ref", ref_name="INV/001", amount=1200.0) # Allocation update
    ]
    entries[1].amount = 1200.0
    
    v_update = VoucherCreate(
        voucher_type_id=vtype_id,
        date=date(2024, 4, 11),
        voucher_number="INV/1",
        entries=entries
    )
    
    update_voucher(v_id, v_update, db)
    
    # Verify Update
    db.expire_all()
    v_updated = db.query(Voucher).filter(Voucher.id == v_id).first()
    entry_party_updated = next(e for e in v_updated.entries if e.ledger_id == party_id)
    
    assert entry_party_updated.amount == 1200.0
    assert len(entry_party_updated.bill_allocations) == 1
    assert entry_party_updated.bill_allocations[0].amount == 1200.0
    
    print("Validation B Passed: Voucher Updated successfully.")
    print("--- All Tests Passed ---")

if __name__ == "__main__":
    test_voucher_lifecycle()
