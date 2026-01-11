from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth import deps
from app.modules.inventory.models import StockItem, StockGroup, UnitOfMeasure
from app.modules.inventory import schemas

router = APIRouter()

# --- Items ---
@router.get("/items", response_model=List[schemas.StockItem])
def read_items(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(StockItem).offset(skip).limit(limit).all()

@router.post("/items", response_model=schemas.StockItem)
def create_item(
    *,
    db: Session = Depends(deps.get_db),
    item_in: schemas.StockItemCreate,
) -> Any:
    # Check uniqueness if needed (part_number)
    item = StockItem(
        name=item_in.name,
        part_number=item_in.part_number,
        group_id=item_in.group_id,
        uom_id=item_in.uom_id,
        gst_rate=item_in.gst_rate
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

# --- Groups ---
@router.get("/groups", response_model=List[schemas.StockGroup])
def read_groups(db: Session = Depends(deps.get_db)):
    return db.query(StockGroup).all()

@router.post("/groups", response_model=schemas.StockGroup)
def create_group(
    *,
    db: Session = Depends(deps.get_db),
    group_in: schemas.StockGroupCreate,
):
    group = StockGroup(name=group_in.name, parent_id=group_in.parent_id)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group

# --- UOM ---
@router.get("/uoms", response_model=List[schemas.UOM])
def read_uoms(db: Session = Depends(deps.get_db)):
    return db.query(UnitOfMeasure).all()

@router.post("/uoms", response_model=schemas.UOM)
def create_uom(
    *,
    db: Session = Depends(deps.get_db),
    uom_in: schemas.UOMCreate,
):
    uom = UnitOfMeasure(name=uom_in.name, symbol=uom_in.symbol, precision=uom_in.precision)
    db.add(uom)
    db.commit()
    db.refresh(uom)
    return uom
