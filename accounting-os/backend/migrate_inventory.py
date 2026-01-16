from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Inventory Engine...")
            
            # 1. Add Columns to StockItem
            try:
                conn.execute(text("ALTER TABLE stockitem ADD COLUMN valuation_method VARCHAR DEFAULT 'AVG'"))
                conn.execute(text("ALTER TABLE stockitem ADD COLUMN opening_quantity FLOAT DEFAULT 0"))
                conn.execute(text("ALTER TABLE stockitem ADD COLUMN opening_value FLOAT DEFAULT 0"))
                conn.execute(text("ALTER TABLE stockitem ADD COLUMN reorder_level FLOAT DEFAULT 0"))
                print("Updated StockItem table.")
            except Exception as e:
                print(f"Skipped updating StockItem (cols might exist): {e}")

            # 2. Create StockLedgerEntry Table
            print("Creating StockLedgerEntry...")
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS stockledgerentry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL,
                stock_item_id INTEGER NOT NULL REFERENCES stockitem(id),
                voucher_id INTEGER REFERENCES voucherentry(id),
                qty_in FLOAT DEFAULT 0,
                qty_out FLOAT DEFAULT 0,
                rate FLOAT DEFAULT 0,
                value FLOAT DEFAULT 0,
                cost_value FLOAT DEFAULT 0,
                is_opening BOOLEAN DEFAULT 0
            )
            """))
            # Index for performance
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_sle_item_date ON stockledgerentry (stock_item_id, date)"))
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
