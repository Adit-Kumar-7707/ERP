from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth import deps
from app.modules.masters.models import CostCenter, PriceLevel
from app.modules.masters import schemas

router = APIRouter()

# --- Cost Centers ---
@router.get("/cost-centers", response_model=List[schemas.CostCenter])
def read_cost_centers(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(CostCenter).offset(skip).limit(limit).all()

@router.post("/cost-centers", response_model=schemas.CostCenter)
def create_cost_center(
    *,
    db: Session = Depends(deps.get_db),
    cc_in: schemas.CostCenterCreate,
) -> Any:
    cc = CostCenter(
        name=cc_in.name,
        code=cc_in.code,
        parent_id=cc_in.parent_id
    )
    db.add(cc)
    db.commit()
    db.refresh(cc)
    return cc

# --- Price Levels ---
@router.get("/price-levels", response_model=List[schemas.PriceLevel])
def read_price_levels(db: Session = Depends(deps.get_db)):
    return db.query(PriceLevel).all()

@router.post("/price-levels", response_model=schemas.PriceLevel)
def create_price_level(
    *,
    db: Session = Depends(deps.get_db),
    pl_in: schemas.PriceLevelCreate,
):
    pl = PriceLevel(name=pl_in.name, description=pl_in.description)
    db.add(pl)
    db.commit()
    db.refresh(pl)
    return pl
