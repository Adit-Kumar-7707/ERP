
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../backend/sql_app.db')

def migrate():
    print(f"Migrating database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Voucher Types
    try:
        cursor.execute("ALTER TABLE voucher_types ADD COLUMN numbering_prefix VARCHAR")
        print("Added numbering_prefix to voucher_types")
    except sqlite3.OperationalError:
        print("numbering_prefix already exists")

    try:
        cursor.execute("ALTER TABLE voucher_types ADD COLUMN numbering_suffix VARCHAR")
        print("Added numbering_suffix to voucher_types")
    except sqlite3.OperationalError:
        print("numbering_suffix already exists")

    try:
        cursor.execute("ALTER TABLE vouchers ADD COLUMN effective_date DATE")
        print("Added effective_date to vouchers")
    except sqlite3.OperationalError:
        print("effective_date already exists")

    # 1.1 Ledgers (GST Columns)
    ledger_cols = [
        ("gstin", "VARCHAR"),
        ("registration_type", "VARCHAR DEFAULT 'Regular'"),
        ("tax_type", "VARCHAR"),
        ("duty_head", "VARCHAR"),
        ("percentage_of_calculation", "FLOAT DEFAULT 0")
    ]
    for col, dtype in ledger_cols:
        try:
            cursor.execute(f"ALTER TABLE ledgers ADD COLUMN {col} {dtype}")
            print(f"Added {col} to ledgers")
        except sqlite3.OperationalError:
            pass

    # 1.2 Stock Items (GST Columns)
    item_cols = [
        ("hsn_code", "VARCHAR"),
        ("gst_rate", "FLOAT DEFAULT 0"),
        ("taxability", "VARCHAR DEFAULT 'Taxable'")
    ]
    for col, dtype in item_cols:
        try:
            cursor.execute(f"ALTER TABLE stock_items ADD COLUMN {col} {dtype}")
            print(f"Added {col} to stock_items")
        except sqlite3.OperationalError:
            pass
    
    # 1.3 Units (Compound Unit Columns)
    unit_cols = [
        ("base_unit_id", "INTEGER"),
        ("conversion_factor", "FLOAT DEFAULT 1.0")
    ]
    for col, dtype in unit_cols:
        try:
            cursor.execute(f"ALTER TABLE units ADD COLUMN {col} {dtype}")
            print(f"Added {col} to units")
        except sqlite3.OperationalError as e:
            print(f"Skipping {col}: {e}")

    # 1.4 Godowns Table
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS godowns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR NOT NULL UNIQUE,
                parent_id INTEGER,
                FOREIGN KEY(parent_id) REFERENCES godowns(id)
            )
        """)
        # Insert Default Godown
        cursor.execute("INSERT OR IGNORE INTO godowns (id, name, parent_id) VALUES (1, 'Main Location', NULL)")
        print("Ensured godowns table and default Main Location")
    except sqlite3.OperationalError as e:
        print(f"Error creating godowns table: {e}")
    
    # 2. Key Indexes (Manual creation because create_all might skip them if table exists)
    # We added index=True in models, but again, create_all won't add indexes to existing tables.
    indexes = [
        ("ix_vouchers_date", "vouchers", "date"),
        ("ix_vouchers_voucher_type_id", "vouchers", "voucher_type_id"),
        ("ix_voucher_entries_ledger_id", "voucher_entries", "ledger_id"),
        ("ix_voucher_entries_stock_item_id", "voucher_entries", "stock_item_id"),
        ("ix_ledgers_group_id", "ledgers", "group_id"),
        ("ix_stock_items_group_id", "stock_items", "group_id")
    ]
    
    for name, table, col in indexes:
        try:
            cursor.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({col})")
            print(f"Ensured index {name} on {table}.{col}")
        except Exception as e:
            print(f"Error creating index {name}: {e}")

    # 1.5 Group GST Columns (stock_groups and account_groups)
    gst_cols = [
        ("hsn_code", "VARCHAR"),
        ("gst_rate", "FLOAT DEFAULT 0"),
        ("taxability", "VARCHAR DEFAULT 'Taxable'")
    ]
    for table in ["stock_groups", "account_groups"]:
        for col, dtype in gst_cols:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {dtype}")
                print(f"Added {col} to {table}")
            except sqlite3.OperationalError:
                pass

    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
