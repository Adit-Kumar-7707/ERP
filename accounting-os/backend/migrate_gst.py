from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for GST Engine...")
            
            # 1. Create GST Tables
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS taxrate (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL UNIQUE,
                rate_percent FLOAT NOT NULL,
                cgst_percent FLOAT DEFAULT 0,
                sgst_percent DEFAULT 0,
                igst_percent DEFAULT 0
            )
            """))
            
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS hsncode (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code VARCHAR NOT NULL UNIQUE,
                description VARCHAR
            )
            """))
            
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS itemtaxconfig (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                stock_item_id INTEGER NOT NULL REFERENCES stockitem(id) UNIQUE,
                tax_rate_id INTEGER NOT NULL REFERENCES taxrate(id),
                hsn_code_id INTEGER REFERENCES hsncode(id)
            )
            """))
            print("Created GST Tables.")
            
            # 2. Update Organization
            try:
                conn.execute(text("ALTER TABLE organization ADD COLUMN gst_number VARCHAR"))
                conn.execute(text("ALTER TABLE organization ADD COLUMN state_code VARCHAR"))
                print("Updated Organization.")
            except Exception as e:
                print(f"Skipped Org Update: {e}")
                
            # 3. Update Account
            try:
                conn.execute(text("ALTER TABLE account ADD COLUMN gst_number VARCHAR"))
                conn.execute(text("ALTER TABLE account ADD COLUMN state_code VARCHAR"))
                conn.execute(text("ALTER TABLE account ADD COLUMN is_registered BOOLEAN DEFAULT 0"))
                print("Updated Account.")
            except Exception as e:
                print(f"Skipped Account Update: {e}")
                
            # Seed Default Tax Rates
            # 5%, 12%, 18%, 28%
            # Check if empty first
            res = conn.execute(text("SELECT count(*) FROM taxrate")).scalar()
            if res == 0:
                print("Seeding Tax Rates...")
                rates = [
                    ("GST 0%", 0, 0, 0, 0),
                    ("GST 5%", 5, 2.5, 2.5, 5),
                    ("GST 12%", 12, 6, 6, 12),
                    ("GST 18%", 18, 9, 9, 18),
                    ("GST 28%", 28, 14, 14, 28)
                ]
                for name, rate, c, s, i in rates:
                    conn.execute(text(f"INSERT INTO taxrate (name, rate_percent, cgst_percent, sgst_percent, igst_percent) VALUES ('{name}', {rate}, {c}, {s}, {i})"))
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
