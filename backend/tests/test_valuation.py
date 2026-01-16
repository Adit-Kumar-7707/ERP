import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal, engine, Base
from app.modules.inventory.models import StockItem, StockGroup, Unit
from app.modules.accounting.models import Voucher, VoucherEntry, VoucherType, Ledger, AccountGroup
from app.modules.inventory.valuation import calculate_weighted_average

def setup_valuation_data():
    db = SessionLocal()
    # Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Setup Item (Open: 10 @ 100 = 1000)
    stk_grp = db.query(StockGroup).first()
    if not stk_grp:
        stk_grp = StockGroup(name="Valuation Grp")
        db.add(stk_grp)
        db.flush()
        
    item = db.query(StockItem).filter(StockItem.name == "Valuation Item").first()
    if item:
        db.delete(item)
        db.commit() # Clear previous
        
    item = StockItem(
        name="Valuation Item", 
        group_id=stk_grp.id,
        opening_qty=10.0,
        opening_rate=100.0,
        opening_value=1000.0 # Rate = 100
    )
    db.add(item)
    db.flush()
    
    # 2. Setup Purchase Voucher (Inward)
    # Buy 10 @ 200 = 2000.
    # Total Qty = 20 (10+10)
    # Total Value = 3000 (1000+2000)
    # New Rate = 150
    
    vtype_pur = db.query(VoucherType).filter(VoucherType.name == "Purchase").first()
    if not vtype_pur:
        vtype_pur = VoucherType(name="Purchase", nature="Purchase")
        db.add(vtype_pur)
        db.flush()
        
    # Dummy Ledger
    led = db.query(Ledger).first()
    if not led:
        grp = AccountGroup(name="Test Grp", nature="Expenses")
        db.add(grp)
        db.flush()
        led = Ledger(name="Test Led", group_id=grp.id)
        db.add(led)
        db.flush()

    v1 = Voucher(voucher_type_id=vtype_pur.id, date=date(2024,4,1), voucher_number="PUR/01")
    db.add(v1)
    db.flush()
    
    e1 = VoucherEntry(
         voucher_id=v1.id, 
         ledger_id=led.id, 
         amount=2000.0, 
         is_debit=True, # Purchase is Debit Stock
         stock_item_id=item.id,
         quantity=10.0,
         rate=200.0
    )
    db.add(e1)
    
    # 3. Setup Sales Voucher (Outward)
    # Sell 5.
    # Cost Rate = 150.
    # COGS = 5 * 150 = 750.
    # Remaining Qty = 15.
    # Remaining Value = 3000 - 750 = 2250.
    # Rate should remain 150.
    
    vtype_sale = db.query(VoucherType).filter(VoucherType.name == "Sales").first()
    if not vtype_sale:
        vtype_sale = VoucherType(name="Sales", nature="Sales")
        db.add(vtype_sale)
        db.flush()

    v2 = Voucher(voucher_type_id=vtype_sale.id, date=date(2024,4,2), voucher_number="SAL/01")
    db.add(v2)
    db.flush()
    
    e2 = VoucherEntry(
         voucher_id=v2.id, 
         ledger_id=led.id, 
         amount=5000.0, # Selling Price irrelevant for Cost
         is_debit=False, # Sales is Credit Stock
         stock_item_id=item.id,
         quantity=5.0,
         rate=1000.0 # Selling Rate
    )
    db.add(e2)
    
    db.commit()
    return item.id

def test_valuation_logic():
    print("--- Testing Inventory Valuation (Weighted Avg) ---")
    item_id = setup_valuation_data()
    db = SessionLocal()
    
    try:
        res = calculate_weighted_average(db, item_id)
        print(f"Result: Qty={res.closing_qty}, Rate={res.closing_rate}, Value={res.closing_value}")
        
        assert res.closing_qty == 15.0
        assert res.closing_rate == 150.0
        assert res.closing_value == 2250.0
        
        print("Validation Passed: Correct Weighted Average.")
    finally:
        db.close()

if __name__ == "__main__":
    test_valuation_logic()
