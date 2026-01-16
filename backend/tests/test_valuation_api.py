import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal, engine, Base
from app.modules.inventory.models import StockItem, StockGroup, Unit
from app.modules.accounting.models import Voucher, VoucherEntry, VoucherType, Ledger, AccountGroup
from app.modules.inventory.router import get_item_valuation

# client = TestClient(app)

def setup_valuation_data():
    db = SessionLocal()
    # Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Setup Item (Open: 10 @ 100 = 1000)
    stk_grp = db.query(StockGroup).first()
    if not stk_grp:
        stk_grp = StockGroup(name="Valuation Grp API")
        db.add(stk_grp)
        db.flush()
        
    item = db.query(StockItem).filter(StockItem.name == "Valuation Item API").first()
    if item:
        db.delete(item)
        db.commit() # Clear previous
        
    item = StockItem(
        name="Valuation Item API", 
        group_id=stk_grp.id,
        opening_qty=10.0,
        opening_rate=100.0,
        opening_value=1000.0 # Rate = 100
    )
    db.add(item)
    db.flush()
    
    # 2. Setup Purchase Voucher (Inward)
    # Buy 10 @ 200 = 2000.
    vtype_pur = db.query(VoucherType).filter(VoucherType.name == "Purchase").first()
    if not vtype_pur:
        vtype_pur = VoucherType(name="Purchase", nature="Purchase")
        db.add(vtype_pur)
        db.flush()
        
    # Dummy Ledger
    grp = db.query(AccountGroup).filter(AccountGroup.name == "Test Grp API").first()
    if not grp:
        grp = AccountGroup(name="Test Grp API", nature="Expenses")
        db.add(grp)
        db.flush()
        
    led = db.query(Ledger).filter(Ledger.name == "Test Led API").first()
    if not led:
        led = Ledger(name="Test Led API", group_id=grp.id)
        db.add(led)
        db.flush()

    v1 = Voucher(voucher_type_id=vtype_pur.id, date=date(2024,4,1), voucher_number="PUR/API/01")
    db.add(v1)
    db.flush()
    
    e1 = VoucherEntry(
         voucher_id=v1.id, 
         ledger_id=led.id, 
         amount=2000.0, 
         is_debit=True,
         stock_item_id=item.id,
         quantity=10.0,
         rate=200.0
    )
    db.add(e1)
    
    db.commit()
    return item.id

def test_valuation_api():
    print("--- Testing Valuation API (Direct Call) ---")
    item_id = setup_valuation_data()
    db = SessionLocal()
    
    try:
        # Should result in 20 Qty @ 150 Rate = 3000 Value
        response = get_item_valuation(item_id, None, db)
        print("Response:", response)
        
        assert response.closing_qty == 20.0
        assert response.closing_rate == 150.0
        assert response.closing_value == 3000.0
        
        print("Api Validation Passed.")
    finally:
        db.close()

if __name__ == "__main__":
    test_valuation_api()
