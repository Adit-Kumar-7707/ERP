from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Jobs Engine...")
            
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS job (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type VARCHAR NOT NULL,
                status VARCHAR DEFAULT 'PENDING',
                progress FLOAT DEFAULT 0.0,
                result JSON,
                params JSON,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                error_message TEXT
            )
            """))
            # Indexing manually (SQLite ignores index creation inside CREATE TABLE sometimes for non-PK)
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_type ON job (type)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_job_status ON job (status)"))
            except Exception:
                pass

            # Also ensure Validation indexes from previous step exist if missed
            # SQLite supports CREATE INDEX IF NOT EXISTS
            indexes = [
                ("ix_journalentry_date", "journalentry", "date"),
                ("ix_journalentry_fy", "journalentry", "financial_year_id"),
                ("ix_journalline_acc", "journalline", "account_id"),
                ("ix_journalline_ent", "journalline", "entry_id"),
                ("ix_auditlog_entity", "auditlog", "entity_id"),
                ("ix_stockledger_item", "stockledgerentry", "stock_item_id"),
                ("ix_stockledger_date", "stockledgerentry", "date")
            ]
            
            for name, tbl, col in indexes:
                try:
                    conn.execute(text(f"CREATE INDEX IF NOT EXISTS {name} ON {tbl} ({col})"))
                    print(f"Ensured index {name}")
                except Exception as e:
                    print(f"Index {name} error: {e}")

            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
