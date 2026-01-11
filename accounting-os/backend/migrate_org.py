from app.db.session import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE organization ADD COLUMN business_type VARCHAR"))
            conn.execute(text("ALTER TABLE organization ADD COLUMN state VARCHAR"))
            conn.execute(text("ALTER TABLE organization ADD COLUMN is_onboarding_completed BOOLEAN DEFAULT 0"))
            print("Migration successful: Added columns to organization table.")
        except Exception as e:
            print(f"Migration failed (columns might already exist): {e}")

if __name__ == "__main__":
    migrate()
