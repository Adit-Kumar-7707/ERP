from app.core.config import settings
from app.core.db import Base
from app.modules.accounting.seed import seed_tally_groups, seed_voucher_types, seed_default_ledgers
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def init():
    # 1. Connect
    engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
    
    # 2. Sync Schema
    print("Creating Tables...")
    Base.metadata.create_all(bind=engine)
    
    # 3. Seed
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    print("Seeding Tally Defaults...")
    seed_tally_groups(db)
    seed_voucher_types(db)
    seed_default_ledgers(db)
    
    from app.modules.inventory.seed import seed_inventory_defaults
    seed_inventory_defaults(db)
    
    db.close()
    print("Database Initialized!")
    
    # 4. Verify
    print("\n--- Hierarchy Verification ---")
    from app.modules.accounting.models import AccountGroup
    roots = db.query(AccountGroup).filter(AccountGroup.parent_id == None).all()
    for root in roots:
        print(f"[{root.nature}] {root.name}")
        children = db.query(AccountGroup).filter(AccountGroup.parent_id == root.id).all()
        for child in children:
            print(f"  └── {child.name}")

if __name__ == "__main__":
    init()
