from sqlalchemy import create_engine, text
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings

def migrate():
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        print("Running SEEK Mission 1 Migration: adding books_beginning_from to organization...")
        
        try:
            # SQLite does not support IF NOT EXISTS in ADD COLUMN in all versions/standard.
            # We just try to add it. If it exists, it catches the error.
            conn.execute(text("ALTER TABLE organization ADD COLUMN books_beginning_from DATE"))
            print("Added books_beginning_from column.")
            
            # Optional: Set a default for existing orgs if needed, e.g. same as fiscal start or current year start
            # For now, leaving it null is safer, logic should handle null as "No Restriction" or "Default to FY Start"
            
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
