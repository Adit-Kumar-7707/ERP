from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # 1. Create FinancialYear Table
            print("Creating FinancialYear table...")
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS financialyear (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL UNIQUE,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                is_closed BOOLEAN DEFAULT 0,
                is_locked BOOLEAN DEFAULT 0,
                locked_upto DATE
            )
            """))
            print("FinancialYear table created/verified.")

            # 2. Add Columns to JournalEntry
            # Check if columns exist first or just try/except
            try:
                conn.execute(text("ALTER TABLE journalentry ADD COLUMN financial_year_id INTEGER REFERENCES financialyear(id)"))
                print("Added financial_year_id to JournalEntry.")
            except Exception as e:
                print(f"Skipping financial_year_id (might exist): {e}")

            try:
                conn.execute(text("ALTER TABLE journalentry ADD COLUMN is_opening BOOLEAN DEFAULT 0"))
                print("Added is_opening to JournalEntry.")
            except Exception as e:
                print(f"Skipping is_opening (might exist): {e}")
                
            try:
                conn.execute(text("ALTER TABLE journalentry ADD COLUMN is_system_entry BOOLEAN DEFAULT 0"))
                print("Added is_system_entry to JournalEntry.")
            except Exception as e:
                print(f"Skipping is_system_entry (might exist): {e}")
                
            try:
                conn.execute(text("ALTER TABLE journalentry ADD COLUMN is_locked BOOLEAN DEFAULT 0"))
                print("Added is_locked to JournalEntry.")
            except Exception as e:
                print(f"Skipping is_locked (might exist): {e}")
                
            # 3. Create Default Financial Year (if none)
            print("Seeding Default Financial Year...")
            existing = conn.execute(text("SELECT count(*) FROM financialyear")).scalar()
            if existing == 0:
                conn.execute(text("""
                INSERT INTO financialyear (name, start_date, end_date, is_active)
                VALUES ('FY 2024-25', '2024-04-01', '2025-03-31', 1)
                """))
                print("Created FY 2024-25.")
                
            # 4. Link existing entries to Default FY
            print("Linking existing unlinked entries to default FY...")
            # Get ID of the FY we just made/found
            fy_id = conn.execute(text("SELECT id FROM financialyear LIMIT 1")).scalar()
            conn.execute(text(f"UPDATE journalentry SET financial_year_id = {fy_id} WHERE financial_year_id IS NULL"))
            print("Linked entries.")

            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
