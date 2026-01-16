from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Starting Migration for Migration Engine...")
            
            # 1. Create Migration Tables
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS importbatch (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename VARCHAR NOT NULL,
                imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR DEFAULT 'Pending',
                record_count INTEGER DEFAULT 0,
                type VARCHAR NOT NULL,
                imported_by_id INTEGER REFERENCES user(id)
            )
            """))
            
            conn.execute(text("""
            CREATE TABLE IF NOT EXISTS importlog (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id INTEGER NOT NULL REFERENCES importbatch(id),
                row_number INTEGER,
                status VARCHAR NOT NULL,
                error_message TEXT,
                raw_data JSON
            )
            """))
            print("Created Migration Tables.")
            
            conn.commit()
            print("Migration successful.")
        except Exception as e:
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
