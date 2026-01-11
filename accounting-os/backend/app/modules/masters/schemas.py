from typing import Optional, List
from pydantic import BaseModel

# Cost Center
class CostCenterBase(BaseModel):
    name: str
    code: Optional[str] = None
    parent_id: Optional[int] = None

class CostCenterCreate(CostCenterBase):
    pass

class CostCenter(CostCenterBase):
    id: int
    class Config:
        from_attributes = True

# Price Level
class PriceLevelBase(BaseModel):
    name: str
    description: Optional[str] = None

class PriceLevelCreate(PriceLevelBase):
    pass

class PriceLevel(PriceLevelBase):
    id: int
    class Config:
        from_attributes = True
