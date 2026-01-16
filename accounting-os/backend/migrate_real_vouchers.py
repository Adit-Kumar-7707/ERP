from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Real Vouchers...")
            
            # 1. Add Columns to VoucherEntry
            try:
                conn.execute(text("ALTER TABLE voucherentry ADD COLUMN party_ledger_id INTEGER REFERENCES account(id)"))
                print("Added party_ledger_id.")
            except Exception as e:
                print(f"Skipped party_ledger_id: {e}")
                
            try:
                conn.execute(text("ALTER TABLE voucherentry ADD COLUMN status VARCHAR DEFAULT 'draft'"))
                print("Added status.")
            except Exception as e:
                print(f"Skipped status: {e}")
                
            try:
                conn.execute(text("ALTER TABLE voucherentry ADD COLUMN net_amount FLOAT DEFAULT 0"))
                conn.execute(text("ALTER TABLE voucherentry ADD COLUMN tax_amount FLOAT DEFAULT 0"))
                conn.execute(text("ALTER TABLE voucherentry ADD COLUMN total_amount FLOAT DEFAULT 0"))
                print("Added total columns.")
            except Exception as e:
                print(f"Skipped total columns: {e}")

            # 2. Create VoucherLineItem Table
            print("Creating VoucherLineItem...")
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS voucherlineitem (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_id INTEGER NOT NULL REFERENCES voucherentry(id),
                ledger_id INTEGER REFERENCES account(id),
                item_id INTEGER REFERENCES stockitem(id),
                description VARCHAR,
                qty FLOAT DEFAULT 0,
                rate FLOAT DEFAULT 0,
                amount FLOAT DEFAULT 0,
                discount_amount FLOAT DEFAULT 0
            )
            """))

            # 3. Create VoucherCharge Table
            print("Creating VoucherCharge...")
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS vouchercharge (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_id INTEGER NOT NULL REFERENCES voucherentry(id),
                ledger_id INTEGER NOT NULL REFERENCES account(id),
                amount FLOAT DEFAULT 0,
                charge_type VARCHAR
            )
            """))
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
