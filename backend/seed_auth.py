from app.core.db import SessionLocal, engine
from app.modules.auth import models, security

def seed_admin_user():
    db = SessionLocal()
    
    # Check if admin exists
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        print("Creating Admin User...")
        hashed_password = security.get_password_hash("admin")
        admin_user = models.User(
            username="admin",
            hashed_password=hashed_password,
            full_name="Administrator",
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("Admin User Created (admin/admin)")
    else:
        print("Admin User already exists.")
        
    db.close()

if __name__ == "__main__":
    seed_admin_user()
