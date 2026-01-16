import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal, engine, Base
from app.modules.inventory.models import StockItem, StockGroup
from app.modules.accounting.models import Voucher, VoucherEntry, VoucherType, Ledger, AccountGroup
from app.modules.inventory.valuation import calculate_weighted_average

def test_stock_journal():
    print("--- Testing Stock Journal (Production) ---")
    db = SessionLocal()
    # Ensure Tables
    Base.metadata.create_all(bind=engine)
    
    # 1. Setup Data
    # Voucher Type
    vtype = db.query(VoucherType).filter(VoucherType.name == "Stock Journal").first()
    if not vtype:
        vtype = VoucherType(name="Stock Journal", nature="Stock Journal")
        db.add(vtype)
        db.flush()
        
    # Ledger (Wash Account)
    grp = db.query(AccountGroup).filter(AccountGroup.name == "Stock Adjustments").first()
    if not grp:
        grp = AccountGroup(name="Stock Adjustments", nature="Expenses")
        db.add(grp)
        db.flush()
    
    wash_ledger = db.query(Ledger).filter(Ledger.name == "Production Wash").first()
    if not wash_ledger:
        wash_ledger = Ledger(name="Production Wash", group_id=grp.id)
        db.add(wash_ledger)
        db.flush()

    # Stock Items
    # Raw Material (RM)
    rm = db.query(StockItem).filter(StockItem.name == "Raw Material").first()
    if not rm:
        rm = StockItem(name="Raw Material", opening_qty=100, opening_rate=10, opening_value=1000)
        db.add(rm)
    else:
        # Reset
        rm.opening_qty = 100
        rm.opening_rate = 10
        rm.opening_value = 1000
    
    # Finished Good (FG)
    fg = db.query(StockItem).filter(StockItem.name == "Finished Good").first()
    if not fg:
        fg = StockItem(name="Finished Good", opening_qty=0, opening_rate=0, opening_value=0)
        db.add(fg)
    else:
        fg.opening_qty = 0
        fg.opening_rate = 0
        fg.opening_value = 0
        
    db.commit()
    db.refresh(rm)
    db.refresh(fg)
    
    # 2. Create Stock Journal Voucher
    # Consumption: 10 RM @ 10 = 100 Value.
    # Production: 1 FG @ 100 (Assumed cost).
    
    v = Voucher(voucher_type_id=vtype.id, date=date(2024,4,1), voucher_number="SJ/01")
    db.add(v)
    db.flush()
    
    # Source (Consumption) -> OUT -> Credit Stock -> Debit Ledger? 
    # Wait. In Tally Logic:
    # Consumption side (Source) = Decrease Stock.
    # Production side (Dest) = Increase Stock.
    
    # In Double Entry Accounting:
    # Stock Decrease = Credit Stock (Real Account goes out).
    # Stock Increase = Debit Stock (Real Account comes in).
    
    # So Source = Credit Stock Entry?
    # But VoucherEntry has `is_debit`. 
    # If is_debit=False => Credit.
    
    # Entry 1: Consume RM
    e1 = VoucherEntry(
        voucher_id=v.id,
        ledger_id=wash_ledger.id,
        is_debit=False, # Credit Stock (Outward)
        amount=100.0,
        stock_item_id=rm.id,
        quantity=10.0,
        rate=10.0 
    )
    db.add(e1)
    
    # Entry 2: Produce FG
    e2 = VoucherEntry(
        voucher_id=v.id,
        ledger_id=wash_ledger.id,
        is_debit=True, # Debit Stock (Inward)
        amount=100.0,
        stock_item_id=fg.id,
        quantity=1.0, # Made 1 item
        rate=100.0 # Cost determined by user or bom
    )
    db.add(e2)
    
    db.commit()
    
    # 3. Verify Valuation
    
    # RM should be 90 Qty.
    res_rm = calculate_weighted_average(db, rm.id)
    print(f"RM: Qty={res_rm.closing_qty}")
    assert res_rm.closing_qty == 90.0
    
    # FG should be 1 Qty @ 100.
    res_fg = calculate_weighted_average(db, fg.id)
    print(f"FG: Qty={res_fg.closing_qty}, Rate={res_fg.closing_rate}")
    assert res_fg.closing_qty == 1.0
    assert res_fg.closing_rate == 100.0
    
    print("Stock Journal Validation Passed.")
    db.close()

if __name__ == "__main__":
    test_stock_journal()
