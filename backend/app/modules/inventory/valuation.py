from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import Optional, Dict

from app.modules.inventory.models import StockItem
from app.modules.accounting.models import VoucherEntry, Voucher

class StockValuationResult:
    def __init__(self, qty=0.0, rate=0.0, value=0.0):
        self.closing_qty = qty
        self.closing_rate = rate
        self.closing_value = value

def calculate_weighted_average(
    db: Session, 
    item_id: int, 
    upto_date: Optional[date] = None
) -> StockValuationResult:
    """
    Calculates Weighted Average Cost up to a specific date.
    Algorithm:
    1. Start with Opening Balance (Qty, Value).
    2. Fetch all Inwards (Purchases) and Outwards (Sales) sorted by Date.
    3. Iterate:
       - If Inward: 
            New Value = OLD_VAL + (New Qty * New Rate)
            New Qty = OLD_QTY + New Qty
            New Rate = New Value / New Qty
       - If Outward:
            Value Reduced = OLD_RATE * Outward Qty
            New Value = OLD_VAL - Value Reduced
            New Qty = OLD_QTY - Outward Qty
            (Rate remains same)
    """
    
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        return StockValuationResult()
        
    current_qty = item.opening_qty
    current_value = item.opening_value
    
    # Avoid div by zero
    current_rate = (current_value / current_qty) if current_qty != 0 else item.opening_rate

    # Fetch ledger entries
    query = db.query(VoucherEntry).join(Voucher).filter(
        VoucherEntry.stock_item_id == item_id
    ).order_by(Voucher.date, Voucher.id)
    
    if upto_date:
        query = query.filter(Voucher.date <= upto_date)
        
    entries = query.all()
    
    for e in entries:
        # Determine movement type.
        # This is tricky without explicit movement type.
        # Heuristic: 
        # - Sales Voucher (Nature=Sales) => Outward ?
        # - Purchase Voucher (Nature=Purchase) => Inward ?
        # - Debit/Credit Note?
        # - Journal?
        
        # Simpler Heuristic based on Voucher Type Nature?
        vtype = e.voucher.voucher_type.nature
        
        is_inward = False
        
        if vtype == "Purchase":
            is_inward = True
        elif vtype == "Sales":
            is_inward = False
        elif vtype == "Receipt": # Sales Return?
             # Complex. MVP: Assume Debit to Stock is Inward, Credit is Outward?
             # Stock Item Account logic: 
             # Purchase: Dr Stock (Inward)
             # Sales: Cr Stock (Outward)
             # So is_debit = True => Inward.
             if e.is_debit:
                 is_inward = True
             else:
                 is_inward = False
        else:
             # Default fallback: Debit is Inward (Asset Increase)
             is_inward = e.is_debit
             
        qty = e.quantity
        rate = e.rate
        amount = e.amount # qty * rate usually
        
        if is_inward:
            # Add to Stock
            current_value += amount
            current_qty += qty
            
            # Re-calculate Weighted Rate
            if current_qty != 0:
                current_rate = current_value / current_qty
        else:
            # Deduct from Stock
            # Valuation at CURRENT AVG RATE, not the rate sold at!
            # The rate in voucher is "Selling Price", not "Cost".
            # COGS = qty * current_rate
            
            cogs = qty * current_rate
            current_value -= cogs
            current_qty -= qty
            
            # Rate remains same (Avg doesn't change on sale)
            
    return StockValuationResult(current_qty, current_rate, current_value)
