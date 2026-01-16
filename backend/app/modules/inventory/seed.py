from sqlalchemy.orm import Session
from app.modules.inventory.models import Unit, StockGroup

def seed_inventory_defaults(db: Session):
    # 1. Units
    if not db.query(Unit).first():
        units = [
            Unit(name="Numbers", symbol="Nos", precision=0),
            Unit(name="Kilograms", symbol="Kgs", precision=2),
            Unit(name="Meters", symbol="Mtr", precision=2),
            Unit(name="Box", symbol="Box", precision=0),
        ]
        db.add_all(units)
        db.commit()
        print("Seeded Default Units")

    # 2. Stock Groups
    if not db.query(StockGroup).first():
        # Tally has "Primary" group by default concept, but usually hidden.
        # We can seed common ones or just leave empty.
        # Let's seed "Primary" if we want to mimic Tally strictly, 
        # but Tally allows creating top-level groups.
        pass
