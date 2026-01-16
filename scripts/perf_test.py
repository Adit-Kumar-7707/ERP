
import sys
import os
import time
import random
from datetime import date, timedelta

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from app.core.db import SessionLocal, engine
from app.modules.accounting.models import Voucher, VoucherEntry, VoucherType, Ledger
from app.modules.accounting import models as accounting_models
import app.modules.inventory.models # Register StockItem

def seed_data(n=1000):
    db = SessionLocal()
    print(f"Seeding {n} vouchers...")
    
    # Get or Create Voucher Type
    v_type = db.query(VoucherType).filter(VoucherType.name == "Sales").first()
    if not v_type:
        print("Sales Voucher Type not found. Creating...")
        v_type = VoucherType(name="Sales", nature="Sales")
        db.add(v_type)
        db.commit()

    # Get Ledgers
    cash = db.query(Ledger).filter(Ledger.name.ilike("%Cash%")).first()
    if not cash:
        print("Cash ledger not found. Creating...")
        # Need a group... "Cash-in-Hand"
        cash_group = db.query(accounting_models.AccountGroup).filter(accounting_models.AccountGroup.name == "Cash-in-Hand").first()
        if not cash_group:
             # Create root group if totally empty DB
             cash_group = accounting_models.AccountGroup(name="Cash-in-Hand", nature="Assets")
             db.add(cash_group)
             db.commit()
        
        cash = Ledger(name="Cash", group_id=cash_group.id)
        db.add(cash)
        db.commit()

    sales = db.query(Ledger).filter(Ledger.name.ilike("%Sales%")).first()
    if not sales:
        print("Sales ledger not found. Creating...")
        sales_group = db.query(accounting_models.AccountGroup).filter(accounting_models.AccountGroup.name == "Sales Accounts").first()
        if not sales_group:
             sales_group = accounting_models.AccountGroup(name="Sales Accounts", nature="Income")
             db.add(sales_group)
             db.commit()
             
        sales = Ledger(name="Sales", group_id=sales_group.id)
        db.add(sales)
        db.commit()

    start_time = time.time()
    
    vouchers = []
    entries = []
    
    # Batch Insert Strategy (if we were using raw SQL or efficient ORM, 
    # but for simplicity we'll loop normal ORM and commit in chunks)
    
    for i in range(n):
        v_date = date.today() - timedelta(days=random.randint(0, 365))
        amount = random.randint(100, 10000)
        
        # Voucher
        v = Voucher(
            voucher_type_id=v_type.id,
            date=v_date,
            voucher_number=f"AUTO-PERF-{i}",
            narration=f"Performance Test Voucher {i}"
        )
        db.add(v)
        db.flush() # Get ID
        
        # Entry 1 (Dr Cash)
        e1 = VoucherEntry(voucher_id=v.id, ledger_id=cash.id, amount=amount, is_debit=True)
        # Entry 2 (Cr Sales)
        e2 = VoucherEntry(voucher_id=v.id, ledger_id=sales.id, amount=amount, is_debit=False)
        
        db.add(e1)
        db.add(e2)
        
        if i % 100 == 0:
            db.commit()
            print(f"Created {i} vouchers...")
            
    db.commit()
    end_time = time.time()
    print(f"Seeding complete in {end_time - start_time:.2f} seconds.")

def benchmark_read():
    db = SessionLocal()
    print("Benchmarking Day Book Read (All Vouchers)...")
    
    start_time = time.time()
    # Simulate Day Book Query (actually fetching ALL for stress, or a wide range)
    # Day Book typically is ONE DAY. Let's query a year.
    
    # We'll query vouchers for Today first (standard use case)
    today = date.today()
    count = db.query(Voucher).filter(Voucher.date == today).count()
    print(f"Today's Vouchers: {count}")
    
    # Query Range (Stress)
    # Using the same join logic as router
    # Note: selectinload is faster for m2m/o2m than lazy loading in loop
    from sqlalchemy.orm import selectinload
    
    vouchers = db.query(Voucher).options(
        selectinload(Voucher.entries).selectinload(VoucherEntry.ledger)
    ).limit(500).all()
    
    end_time = time.time()
    print(f"Fetched 500 Vouchers (with full preload) in {end_time - start_time:.4f} seconds.")

if __name__ == "__main__":
    seed_data(500)
    benchmark_read()
