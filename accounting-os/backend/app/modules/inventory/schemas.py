from typing import Optional, List
from pydantic import BaseModel

# UOM
class UOMBase(BaseModel):
    name: str
    symbol: str
    precision: int = 2

class UOMCreate(UOMBase):
    pass

class UOM(UOMBase):
    id: int
    class Config:
        from_attributes = True

# Group
class StockGroupBase(BaseModel):
    name: str
    parent_id: Optional[int] = None

class StockGroupCreate(StockGroupBase):
    pass

class StockGroup(StockGroupBase):
    id: int
    class Config:
        from_attributes = True

# Item
class StockItemBase(BaseModel):
    name: str
    part_number: Optional[str] = None
    group_id: Optional[int] = None
    uom_id: Optional[int] = None
    gst_rate: float = 0.0
    valuation_method: str = "AVG"
    reorder_level: float = 0.0

class StockItemCreate(StockItemBase):
    opening_quantity: float = 0.0
    opening_value: float = 0.0
    inventory_account_id: Optional[int] = None
    cogs_account_id: Optional[int] = None
    sales_account_id: Optional[int] = None
    purchase_account_id: Optional[int] = None

class StockItem(StockItemBase):
    id: int
    group: Optional[StockGroup] = None
    uom: Optional[UOM] = None
    
    opening_quantity: float = 0.0
    opening_value: float = 0.0
    
    class Config:
        from_attributes = True
