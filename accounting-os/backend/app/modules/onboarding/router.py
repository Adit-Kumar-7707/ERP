from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.modules.auth.deps import get_db, get_current_active_user
from app.modules.organization.models import Organization
from app.modules.organization.schemas import OrganizationUpdate
from typing import Any

router = APIRouter()

@router.post("/complete", response_model=Any)
def complete_onboarding(
    org_in: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Complete the onboarding wizard.
    Updates the organization with business details and sets is_onboarding_completed=True.
    """
    # Assuming single tenant / single org for now
    org = db.query(Organization).first()
    if not org:
        # Create default org if not exists (should have been created by seed/migration)
        org = Organization(name="My Company", is_onboarding_completed=False)
        db.add(org)
    
    # Update fields from payload
    if org_in.name:
        org.name = org_in.name
    if org_in.currency_symbol:
        org.currency_symbol = org_in.currency_symbol
    if org_in.features:
        org.features = org_in.features
    if org_in.gstin:
        org.gstin = org_in.gstin
    if org_in.address:
        org.address = org_in.address
    if org_in.business_type:
        org.business_type = org_in.business_type
    if org_in.state:
        org.state = org_in.state
    
    # Force mark as complete
    org.is_onboarding_completed = True
    
    db.commit()
    db.refresh(org)
    return {"status": "success", "org_id": org.id}
