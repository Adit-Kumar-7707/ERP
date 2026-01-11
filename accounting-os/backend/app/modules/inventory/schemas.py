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

class StockItemCreate(StockItemBase):
    pass

class StockItem(StockItemBase):
    id: int
    group: Optional[StockGroup] = None
    uom: Optional[UOM] = None
    
    class Config:
        from_attributes = True
