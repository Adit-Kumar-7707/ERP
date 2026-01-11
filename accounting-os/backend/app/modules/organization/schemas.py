from typing import Dict, Any, Optional
from pydantic import BaseModel

class OrganizationBase(BaseModel):
    name: str
    currency_symbol: Optional[str] = "$"
    features: Dict[str, Any] = {} # Changed to Any to allow storing metadata if needed
    fiscal_year_start: Optional[str] = "04-01"
    address: Optional[str] = None
    gstin: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    business_type: Optional[str] = None
    state: Optional[str] = None
    is_onboarding_completed: bool = False

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    currency_symbol: Optional[str] = None
    features: Optional[Dict[str, Any]] = None
    address: Optional[str] = None
    gstin: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    business_type: Optional[str] = None
    state: Optional[str] = None
    is_onboarding_completed: Optional[bool] = None

class Organization(OrganizationBase):
    id: int

    class Config:
        from_attributes = True
