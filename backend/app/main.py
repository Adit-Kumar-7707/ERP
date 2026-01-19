from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.db import engine
from app.modules.accounting.models import Base
from app.modules.accounting.router import router as accounting_router
from app.modules.vouchers.router import router as vouchers_router
from app.modules.analytics.router import router as analytics_router
from app.modules.inventory.router import router as inventory_router
from app.modules.auth.router import router as auth_router
from app.modules.tax.router import router as tax_router
from app.modules.reports.router import router as reports_router
from app.modules.banking.router import router as banking_router
from app.modules.audit.router import router as audit_router
from app.modules.impex.router import router as impex_router
import app.modules.auth.models # Ensure tables created

# Database Setup (Quick Init)
Base.metadata.create_all(bind=engine)


@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        from app.modules.auth import models, security
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
    except Exception as e:
        print(f"Error seeding admin user: {e}")
    finally:
        db.close()

app = FastAPI(title=settings.PROJECT_NAME)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounting_router, prefix="/api/v1/accounting")
app.include_router(vouchers_router, prefix="/api/v1/vouchers")
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(inventory_router, prefix="/api/v1/inventory")
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(tax_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1/reports")
app.include_router(banking_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")
app.include_router(impex_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Accounting OS (Tally Clone) Backend Active"}

@app.get("/health")
def health():
    return {"status": "ok", "db": "connected"}
