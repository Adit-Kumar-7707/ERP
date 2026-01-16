from sqlalchemy import Column, Integer, String, Boolean, JSON, Date
from app.db.base import Base

class Organization(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    currency_symbol = Column(String, default="$")
    
    # Feature Toggles stored as JSON
    # Example: {"inventory": true, "gst": false, "tdl_rules": true}
    features = Column(JSON, default={})
    
    # Settings
    fiscal_year_start = Column(String, default="04-01") # MM-DD
    books_beginning_from = Column(Date, nullable=True) # Operational start date
    
    # Details
    address = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    gst_number = Column(String, nullable=True) # Alias or separate? Let's treat GSTIN as primary but add this for consistency with Plan
    email = Column(String, nullable=True)
    website = Column(String, nullable=True)

    # Onboarding Fields
    business_type = Column(String, nullable=True) # Retail, Service, Trading
    state = Column(String, nullable=True) # State Name
    state_code = Column(String, nullable=True) # e.g. "27"
    is_onboarding_completed = Column(Boolean, default=False)
    
    # Safety
    is_deleted = Column(Boolean, default=False)
    is_onboarding_completed = Column(Boolean, default=False)
