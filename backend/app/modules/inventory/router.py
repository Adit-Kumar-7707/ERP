from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.core.db import get_db
from app.modules.inventory.models import Unit, StockGroup, StockItem
from app.modules.inventory.valuation import calculate_weighted_average

router = APIRouter()

# --- Schemas ---

class UnitSchema(BaseModel):
    id: int
    name: str
    symbol: str
    precision: int
    base_unit_id: Optional[int]
    conversion_factor: float
    class Config:
        from_attributes = True

class UnitCreate(BaseModel):
    name: str
    symbol: str
    precision: int = 0
    base_unit_id: Optional[int] = None
    conversion_factor: float = 1.0

class StockGroupSchema(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    class Config:
        from_attributes = True

class StockGroupCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class StockItemCreate(BaseModel):
    name: str
    group_id: Optional[int] = None
    unit_id: Optional[int]
    opening_qty: float = 0.0
    opening_rate: float = 0.0
    opening_value: float = 0.0
    
    # GST
    hsn_code: Optional[str] = None
    gst_rate: float = 0.0
    taxability: str = "Taxable"

class StockItemSchema(StockItemCreate):
    id: int
    effective_gst_rate: float
    class Config:
        from_attributes = True
        
class StockValuationResponse(BaseModel):
    stock_item_id: int
    stock_item_name: str
    closing_quantity: float
    closing_rate: float
    closing_value: float
    as_of_date: Optional[date] = None

# ... (Previous Endpoints)

@router.put("/items/{id}", response_model=StockItemSchema)
def update_stock_item(id: int, item_in: StockItemCreate, db: Session = Depends(get_db)):
    db_item = db.query(StockItem).filter(StockItem.id == id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Stock Item not found")
    
    # Check duplicate name fields if changed
    if db_item.name != item_in.name:
         existing = db.query(StockItem).filter(StockItem.name == item_in.name).first()
         if existing:
             raise HTTPException(status_code=400, detail="Stock Item name already in use")

    # Recalculate Value if needed
    if item_in.opening_value == 0 and item_in.opening_qty > 0 and item_in.opening_rate > 0:
        item_in.opening_value = item_in.opening_qty * item_in.opening_rate

    db_item.name = item_in.name
    db_item.group_id = item_in.group_id
    db_item.unit_id = item_in.unit_id
    db_item.opening_qty = item_in.opening_qty
    db_item.opening_rate = item_in.opening_rate
    db_item.opening_value = item_in.opening_value
    
    # GST
    db_item.hsn_code = item_in.hsn_code
    db_item.gst_rate = item_in.gst_rate
    db_item.taxability = item_in.taxability
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/items/{id}", response_model=dict)
def delete_stock_item(id: int, db: Session = Depends(get_db)):
    from sqlalchemy.exc import IntegrityError
    item = db.query(StockItem).filter(StockItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock Item not found")
        
    try:
        db.delete(item)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete Stock Item. Likely used in Vouchers.")
        
    return {"status": "deleted", "id": id}

@router.get("/items/{id}/valuation", response_model=StockValuationResponse)
def get_item_valuation(id: int, date: Optional[date] = None, db: Session = Depends(get_db)):
    """
    Returns the Weighted Average Valuation for a Stock Item as of a specific date.
    """
    stock_item = db.query(StockItem).filter(StockItem.id == id).first()
    if not stock_item:
        raise HTTPException(status_code=404, detail="Stock Item not found")

    res = calculate_weighted_average(db, id, date)
    return StockValuationResponse(
        stock_item_id=id,
        stock_item_name=stock_item.name,
        closing_qty=res.closing_qty,
        closing_rate=res.closing_rate,
        closing_value=res.closing_value,
        as_of_date=date
    )

# --- Unit Endpoints ---

@router.post("/units/", response_model=UnitSchema)
def create_unit(unit_in: UnitCreate, db: Session = Depends(get_db)):
    # Check duplicate symbol
    existing = db.query(Unit).filter(Unit.symbol == unit_in.symbol).first()
    if existing:
        raise HTTPException(status_code=400, detail="Unit symbol already exists")
        
    unit = Unit(
        name=unit_in.name,
        symbol=unit_in.symbol,
        precision=unit_in.precision,
        base_unit_id=unit_in.base_unit_id,
        conversion_factor=unit_in.conversion_factor
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

@router.get("/units/", response_model=List[UnitSchema])
def read_units(db: Session = Depends(get_db)):
    return db.query(Unit).all()

# --- Godown Endpoints ---

class GodownSchema(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    class Config:
        from_attributes = True

class GodownCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

@router.post("/godowns/", response_model=GodownSchema)
def create_godown(godown_in: GodownCreate, db: Session = Depends(get_db)):
    from app.modules.inventory.models import Godown # Local import to ensure availability
    
    existing = db.query(Godown).filter(Godown.name == godown_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Godown name already exists")
    
    godown = Godown(name=godown_in.name, parent_id=godown_in.parent_id)
    db.add(godown)
    db.commit()
    db.refresh(godown)
    return godown

@router.get("/godowns/", response_model=List[GodownSchema])
def read_godowns(db: Session = Depends(get_db)):
    from app.modules.inventory.models import Godown
    return db.query(Godown).all()
