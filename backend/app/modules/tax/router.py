from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import date

from app.core.db import get_db
from app.modules.accounting.models import Ledger, Organization
from app.modules.inventory.models import StockItem
from app.modules.tax.engine import calculate_gst, determine_place_of_supply

router = APIRouter()

class TaxEntryRequest(BaseModel):
    ledger_id: int
    amount: float # Absolute amount
    is_debit: bool
    stock_item_id: Optional[int] = None

class TaxAnalysisRequest(BaseModel):
    date: date
    entries: List[TaxEntryRequest]

class TaxLineResponse(BaseModel):
    tax_type: str # IGST, CGST, SGST
    rate: float
    taxable_amount: float
    tax_amount: float
    ledger_name: str # Suggested name, e.g. "Output IGST 18%"

@router.post("/calculate", response_model=List[TaxLineResponse])
def calculate_voucher_tax(req: TaxAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyzes a draft voucher and returns the calculated tax breakdown.
    """
    
    # 1. Fetch Organization State
    org = db.query(Organization).first()
    org_state = org.state if org and org.state else "Karnataka" # Default
    
    # 2. Identify Party State and Taxable Items
    party_state = None
    taxable_value_by_rate = {} # { rate: total_amount }
    
    for e in req.entries:
        ledger = db.query(Ledger).filter(Ledger.id == e.ledger_id).first()
        if not ledger: 
            continue
            
        # Detect Party State
        # Logic: If ledger has state defined, use it.
        # Priority: If multiple ledgers have state, last one wins? 
        # Usually validity check ensures only one party.
        if ledger.state:
            party_state = ledger.state
            
        # Detect Item Rate
        if e.stock_item_id:
            item = db.query(StockItem).filter(StockItem.id == e.stock_item_id).first()
            if item:
                rate = item.effective_gst_rate
                if rate > 0:
                    current = taxable_value_by_rate.get(rate, 0.0)
                    taxable_value_by_rate[rate] = current + e.amount
    
    # 3. Determine Supply Type
    # If no party state found, assume Intra (Counter Sales)
    supply_type = determine_place_of_supply(org_state, party_state or org_state)
    is_inter_state = (supply_type == "Inter")
    
    # 4. Calculate Tax
    results = []
    
    for rate, amount in taxable_value_by_rate.items():
        res = calculate_gst(amount, rate, is_inter_state)
        
        if is_inter_state:
             results.append(TaxLineResponse(
                 tax_type="IGST",
                 rate=rate,
                 taxable_amount=amount,
                 tax_amount=res.igst_amount,
                 ledger_name=f"Output IGST {rate}%" 
             ))
        else:
             # CGST
             results.append(TaxLineResponse(
                 tax_type="CGST",
                 rate=rate / 2,
                 taxable_amount=amount,
                 tax_amount=res.cgst_amount,
                 ledger_name=f"Output CGST {rate/2}%"
             ))
             # SGST
             results.append(TaxLineResponse(
                 tax_type="SGST",
                 rate=rate / 2,
                 taxable_amount=amount,
                 tax_amount=res.sgst_amount,
                 ledger_name=f"Output SGST {rate/2}%"
             ))
             
    return results
