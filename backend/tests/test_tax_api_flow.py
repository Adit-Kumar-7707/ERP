import sys
import os
import requests
from datetime import date

# Add project root to path (optional if running as module, but safely adding)
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Assumes backend is running, but let's try to trust the router logic via direct import or assume test DB?
# Actually, for "Flow" tests, we usually use TestClient from fastapi.testclient
# But our previous tests used direct DB manipulation.
# Let's use TestClient for this one as it relies on API Models.

# from fastapi.testclient import TestClient
# from app.main import app
from app.core.db import SessionLocal, engine
from app.modules.accounting.models import Ledger, Organization, AccountGroup, Base
from app.modules.inventory.models import StockItem, StockGroup, Unit

# Import router function directly
from app.modules.tax.router import calculate_voucher_tax, TaxAnalysisRequest, TaxEntryRequest

# client = TestClient(app)

def setup_data():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # 1. Setup Organization (Karnataka)
    org = db.query(Organization).first()
    if not org:
        org = Organization(name="Test Org", state="Karnataka", financial_year_start=date(2024,4,1), books_beginning_from=date(2024,4,1))
        db.add(org)
    else:
        org.state = "Karnataka"
        org.gstin = "29AAAAA0000A1Z5"
        
    # 2. Setup Party (Tamil Nadu -> Inter State)
    # Ensure Group exists
    group = db.query(AccountGroup).filter(AccountGroup.name == "Sundry Debtors").first()
    if not group:
        group = AccountGroup(name="Sundry Debtors", nature="Assets")
        db.add(group)
        db.flush()
        
    party = db.query(Ledger).filter(Ledger.name == "Test Customer TN").first()
    if not party:
        party = Ledger(name="Test Customer TN", group_id=group.id, state="Tamil Nadu")
        db.add(party)
        db.flush()
    else:
        party.state = "Tamil Nadu" # Ensure state
    
    # 3. Setup Stock Item (18% GST)
    unit = db.query(Unit).first()
    stk_grp = db.query(StockGroup).first()
    if not stk_grp:
        stk_grp = StockGroup(name="Primary", gst_rate=18.0)
        db.add(stk_grp)
        db.flush()
        
    item = db.query(StockItem).filter(StockItem.name == "Test Item 18%").first()
    if not item:
        item = StockItem(name="Test Item 18%", group_id=stk_grp.id, gst_rate=18.0)
        db.add(item)
    else:
        item.gst_rate = 18.0

    # 4. Setup Sales Ledger
    sales_led_grp = db.query(AccountGroup).filter(AccountGroup.name == "Sales Accounts").first()
    if not sales_led_grp:
        sales_led_grp = AccountGroup(name="Sales Accounts", nature="Income")
        db.add(sales_led_grp)
        db.flush()
        
    sales_ledger = db.query(Ledger).filter(Ledger.name == "Sales GST").first()
    if not sales_ledger:
        sales_ledger = Ledger(name="Sales GST", group_id=sales_led_grp.id)
        db.add(sales_ledger)
        db.flush()

    db.commit()
    db.refresh(party)
    db.refresh(item)
    db.refresh(sales_ledger)
    return party.id, item.id, sales_ledger.id

def test_tax_api():
    print("--- Testing Tax Logic (Direct Function Call) ---")
    party_id, item_id, sales_id = setup_data()
    print(f"Setup Complete. Party={party_id}, Item={item_id}, Sales={sales_id}")
    
    # Payload: 1 Item @ 1000Rs
    req = TaxAnalysisRequest(
        date=date(2024,4,1),
        entries=[
            TaxEntryRequest(
                ledger_id=party_id, # Party (Has State)
                amount=1000.0,
                is_debit=True,
                stock_item_id=None
            ),
            TaxEntryRequest(
                ledger_id=sales_id, # Valid Sales Ledger
                amount=1000.0,
                is_debit=False,
                stock_item_id=item_id # Has Rate 18%
            )
        ]
    )
    
    # Call function directly
    db = SessionLocal()
    try:
        results = calculate_voucher_tax(req, db)
        print("Results:", results)
        
        # Verify Inter-State (IGST 18%)
        assert len(results) == 1
        tax_line = results[0]
        assert tax_line.tax_type == "IGST"
        assert tax_line.rate == 18.0
        assert tax_line.taxable_amount == 1000.0
        assert tax_line.tax_amount == 180.0
        assert tax_line.ledger_name == "Output IGST 18.0%"
        
        print("Validation Passed: Correctly identified IGST 18%")
    finally:
        db.close()
    
    print("--- Tax API Test Passed ---")

if __name__ == "__main__":
    test_tax_api()
