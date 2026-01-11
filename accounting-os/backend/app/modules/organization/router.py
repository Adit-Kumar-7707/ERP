from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.modules.auth import deps
from app.modules.organization.models import Organization
from app.modules.organization.schemas import Organization as OrganizationSchema, OrganizationUpdate

router = APIRouter()

@router.get("/", response_model=OrganizationSchema)
def get_organization_config(
    db: Session = Depends(deps.get_db),
    # In a real SaaS, we'd check which org the user belongs to.
    # For this MVP, we assume Single Org (ID=1).
) -> Any:
    """
    Get Organization configuration and feature toggles.
    """
    org = db.query(Organization).filter(Organization.id == 1).first()
    if not org:
        # Auto-create if missing (Self-healing for MVP)
        org = Organization(name="My Company", features={"inventory": False, "gst": False})
        db.add(org)
        db.commit()
        db.refresh(org)
    return org

@router.put("/", response_model=OrganizationSchema)
def update_organization_config(
    *,
    db: Session = Depends(deps.get_db),
    org_in: OrganizationUpdate,
    # current_user = Depends(deps.get_current_active_owner) # Restricted
) -> Any:
    """
    Update Organization configuration.
    """
    org = db.query(Organization).filter(Organization.id == 1).first()
    # Basic update logic
    if org_in.name:
        org.name = org_in.name
    if org_in.currency_symbol:
        org.currency_symbol = org_in.currency_symbol
    if org_in.address is not None:
        org.address = org_in.address
    if org_in.gstin is not None:
        org.gstin = org_in.gstin
    if org_in.email is not None:
        org.email = org_in.email
    if org_in.website is not None:
        org.website = org_in.website
        
    if org_in.features is not None:
        # Merge or replace logic? Let's replace top-level keys
        current_features = org.features or {}
        current_features.update(org_in.features)
        org.features = current_features
        # Force update for JSON field
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(org, "features")

    db.add(org)
    db.commit()
    db.refresh(org)
    return org
