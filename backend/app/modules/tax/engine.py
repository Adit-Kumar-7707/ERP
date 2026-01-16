from datetime import date
from typing import List, Dict, Optional, Tuple

class TaxCalculationResult:
    def __init__(self):
        self.taxable_value: float = 0.0
        self.cgst_amount: float = 0.0
        self.sgst_amount: float = 0.0
        self.igst_amount: float = 0.0
        self.total_tax: float = 0.0
        
    @property
    def total_amount(self):
        return self.taxable_value + self.total_tax

def calculate_gst(
    taxable_value: float,
    rate: float,
    is_inter_state: bool, # True for IGST, False for CGST+SGST
) -> TaxCalculationResult:
    """
    Core calculation logic.
    """
    res = TaxCalculationResult()
    res.taxable_value = taxable_value
    
    if rate <= 0:
        return res
        
    tax_amount = taxable_value * (rate / 100.0)
    
    if is_inter_state:
        res.igst_amount = round(tax_amount, 2)
    else:
        half_tax = round(tax_amount / 2, 2)
        res.cgst_amount = half_tax
        res.sgst_amount = half_tax # Potential rounding issue if odd? Tally splits 18% -> 9% + 9%, so usually fine.
        
    res.total_tax = res.cgst_amount + res.sgst_amount + res.igst_amount
    return res

def determine_place_of_supply(org_state: str, party_state: str) -> str:
    """
    Returns 'Intra' (Same State) or 'Inter' (Diff State).
    Handles empty party_state as 'Intra' (Consumer/Counter Sales often assumed local).
    """
    if not party_state:
        return "Intra" # Assumption
        
    # normalization
    o_st = org_state.strip().lower() if org_state else ""
    p_st = party_state.strip().lower()
    
    if o_st == p_st:
        return "Intra"
    else:
        return "Inter"
