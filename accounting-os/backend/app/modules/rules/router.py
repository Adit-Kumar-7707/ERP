from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.modules.auth import deps
from app.modules.rules.models import Rule
from app.modules.rules import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.Rule])
def read_rules(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return db.query(Rule).offset(skip).limit(limit).all()

@router.post("/", response_model=schemas.Rule)
def create_rule(
    *,
    db: Session = Depends(deps.get_db),
    rule_in: schemas.RuleCreate,
) -> Any:
    rule = Rule(
        name=rule_in.name,
        description=rule_in.description,
        event=rule_in.event,
        target_voucher_type_id=rule_in.target_voucher_type_id,
        condition=rule_in.condition,
        action=rule_in.action,
        message=rule_in.message
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule
