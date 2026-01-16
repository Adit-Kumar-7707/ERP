from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Audit & Safety Engine...")
            
            # 1. Create Audit Tables
            # Using SQLAlchemy generic types mapping to SQLite
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS auditlog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action VARCHAR NOT NULL,
                entity_type VARCHAR NOT NULL,
                entity_id VARCHAR,
                user_id INTEGER REFERENCES user(id),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR,
                before_state JSON,
                after_state JSON
            )
            """))
            
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS voucherversion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                voucher_id INTEGER NOT NULL REFERENCES voucherentry(id),
                version_number INTEGER NOT NULL,
                snapshot_json JSON NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_by_id INTEGER REFERENCES user(id)
            )
            """))
            print("Created Audit Tables.")
            
            # 2. Add is_deleted columns
            # Soft Delete
            tables = ["account", "organization", "stockitem"]
            for tbl in tables:
                try:
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
                    print(f"Updated {tbl} with is_deleted.")
                except Exception as e:
                    print(f"Skipped {tbl} Update (maybe exists): {e}")

            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
