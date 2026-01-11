from typing import Optional
from pydantic import BaseModel

class RuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    event: str = "before_save"
    target_voucher_type_id: Optional[int] = None
    condition: str
    action: str = "block"
    message: Optional[str] = None

class RuleCreate(RuleBase):
    pass

class Rule(RuleBase):
    id: int
    class Config:
        from_attributes = True
