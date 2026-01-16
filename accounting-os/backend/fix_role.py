from app.db.session import engine
from sqlalchemy import text
from app.modules.auth.models import User, UserRole

def fix_user_role():
    with engine.connect() as conn:
        try:
            # Update all users to be owner for now (development mode)
            conn.execute(text(f"UPDATE user SET role = 'owner'"))
            conn.commit()
            print("Successfully updated all users to Owner role.")
        except Exception as e:
            print(f"Failed to update user role: {e}")

if __name__ == "__main__":
    fix_user_role()
