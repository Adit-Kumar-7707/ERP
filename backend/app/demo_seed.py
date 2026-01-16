from sqlalchemy.orm import Session
from app.modules.accounting.models import Ledger, AccountGroup
from app.modules.inventory.models import StockItem, StockGroup, Unit

def seed_demo_data(db: Session):
    # 1. Groups
    sales_group = db.query(AccountGroup).filter(AccountGroup.name == "Sales Accounts").first()
    sundry_debtors = db.query(AccountGroup).filter(AccountGroup.name == "Sundry Debtors").first()
    
    # 2. Ledgers
    if not db.query(Ledger).filter(Ledger.name == "Sales A/c").first():
        db.add(Ledger(name="Sales A/c", group_id=sales_group.id))
        
    if not db.query(Ledger).filter(Ledger.name == "Customer A").first():
        db.add(Ledger(name="Customer A", group_id=sundry_debtors.id))
        
    # 3. Inventory
    box_unit = db.query(Unit).filter(Unit.name == "Box").first()
    if not box_unit:
        box_unit = Unit(name="Box", symbol="Box", precision=0)
        db.add(box_unit)
    
    sku_group = StockGroup(name="Electronics")
    db.add(sku_group)
    db.commit()
    
    if not db.query(StockItem).filter(StockItem.name == "iPhone 15").first():
        db.add(StockItem(name="iPhone 15", group_id=sku_group.id, unit_id=box_unit.id, opening_qty=10, opening_rate=70000))
        
    db.commit()
    print("Demo Data Seeded")
