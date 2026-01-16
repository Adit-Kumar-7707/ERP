from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Inventory Accounts...")
            cols = [
                "inventory_account_id",
                "cogs_account_id",
                "sales_account_id", 
                "purchase_account_id"
            ]
            for col in cols:
                try:
                    conn.execute(text(f"ALTER TABLE stockitem ADD COLUMN {col} INTEGER REFERENCES account(id)"))
                    print(f"Added {col}.")
                except Exception as e:
                    print(f"Skipped {col}: {e}")
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
