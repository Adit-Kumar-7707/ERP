from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings


# Check if database tables exist, create if not (for fast MVP iteration)
# In production, use Alembic.
from app.db.session import engine
from app.modules.auth.models import Base as AuthBase
from app.modules.accounting.models import Base as AccountingBase
from app.modules.organization.models import Base as OrgBase
from app.modules.vouchers.models import Base as VoucherBase
from app.modules.inventory.models import Base as InventoryBase
from app.modules.masters.models import Base as MastersBase
from app.modules.masters.models import Base as MastersBase
from app.modules.rules.models import Base as RulesBase
from app.modules.analytics.models import Base as AnalyticsBase
from app.modules.audit.models import Base as AuditBase
from app.db.base import Base

from app.modules.auth.router import router as auth_router
from app.modules.accounting.router import router as accounting_router
from app.modules.organization.router import router as organization_router
from app.modules.vouchers.router import router as vouchers_router
from app.modules.inventory.router import router as inventory_router
from app.modules.masters.router import router as masters_router
from app.modules.rules.router import router as rules_router
from app.modules.analytics.router import router as analytics_router
from app.modules.reports.router import router as reports_router
from app.modules.audit.router import router as audit_router
from app.modules.onboarding.router import router as onboarding_router

# Ensure models are imported for metadata creation
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(accounting_router, prefix=f"{settings.API_V1_STR}/accounting", tags=["accounting"])
app.include_router(organization_router, prefix=f"{settings.API_V1_STR}/organization", tags=["organization"])
app.include_router(vouchers_router, prefix=f"{settings.API_V1_STR}/vouchers", tags=["vouchers"])
app.include_router(inventory_router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(masters_router, prefix=f"{settings.API_V1_STR}/masters", tags=["masters"])
app.include_router(rules_router, prefix=f"{settings.API_V1_STR}/rules", tags=["rules"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(reports_router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(audit_router, prefix=f"{settings.API_V1_STR}/audit", tags=["audit"])
app.include_router(onboarding_router, prefix=f"{settings.API_V1_STR}/onboarding", tags=["onboarding"])

@app.get("/")
def root():
    return {"message": "Welcome to Accounting OS API"}
