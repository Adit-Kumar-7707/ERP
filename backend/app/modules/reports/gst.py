from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, List, Any
from datetime import date

from app.modules.accounting.models import Voucher, VoucherEntry, Ledger, VoucherType, Organization
from app.modules.inventory.models import StockItem

def generate_gstr1_json(db: Session, from_date: date, to_date: date) -> Dict[str, Any]:
    # 1. Fetch Organization Details
    org = db.query(Organization).first()
    if not org or not org.gstin:
        return {"error": "Organization GSTIN not set"}
        
    fp = to_date.strftime("%m%Y") # Return Period e.g. 122024
    
    # 2. Fetch Sales Vouchers
    # We look for voucher types of nature "Sales"
    # Or just Type Name "Sales"
    
    # Get Sales Voucher Type IDs
    # v_types = db.query(VoucherType).filter(VoucherType.nature == "Sales").all()
    # ids = [v.id for v in v_types]
    
    # Simpler: Join VoucherType and filter nature
    vouchers = db.query(Voucher).join(VoucherType).filter(
        VoucherType.nature == "Sales",
        Voucher.date >= from_date,
        Voucher.date <= to_date
    ).all()
    
    b2b = []
    b2cs = []
    
    for v in vouchers:
        # Identify Party (Debtor)
        # Usually the entry with 'is_debit=True' and Group='Sundry Debtors'
        # But cash sales?
        
        party_ledger = None
        # primary_entries = [e for e in v.entries if e.is_debit] # Sales usually credits Income, Debits Party/Cash
        # Find the entry that IS NOT tax and IS NOT Sales Account
        
        # Better heuristic:
        # Find entry where Ledger Group is "Sundry Debtors" or "Cash-in-Hand" or "Bank Accounts"
        for e in v.entries:
            # We need to check group. 
            # Doing this in loop is N+1, but fine for MVP export (low volume).
            # e.ledger lazy loaded? Yes.
            group_name = _get_root_group_name(e.ledger.group)
            if group_name in ["Sundry Debtors", "Cash-in-Hand", "Bank Accounts"]:
                party_ledger = e.ledger
                break
                
        if not party_ledger:
            continue # Skip invalid voucher
            
        # Classify B2B or B2C
        is_b2b = (party_ledger.gstin is not None and len(party_ledger.gstin) > 5)
        
        # Extract Items / Tax Breakdown
        # We need to summarize by Rate.
        # Find entries that are "Sales Accounts" (Taxable Value) or "StockItem" linked?
        # And Tax entries.
        
        # Strategy: Iterate entries.
        # If StockItem present -> It's a line item. Get value, rate.
        # If Ledger is under "Sales Accounts" -> It's a line item (Service).
        # If Ledger is under "Duties & Taxes" -> It's tax.
        
        # But GSTR1 requires grouping validation by Rate.
        # We need to pair Line Item Value with its Rate.
        
        item_details = {} # Rate -> {txval, iamt, camt, samt}
        
        for e in v.entries:
            if e.stock_item:
                # Item Line
                rate = e.stock_item.mst_gst_rate or e.stock_item.gst_rate or 0
                val = e.amount
                if rate not in item_details: item_details[rate] = {"txval":0, "iamt":0, "camt":0, "samt":0}
                item_details[rate]["txval"] += val
                
            elif _is_sales_ledger(e.ledger):
                # Service Line (Assume 18% if unknown or fetch from ledger)
                # MVP: Mock 18% if not set
                rate = 18.0
                val = e.amount
                if rate not in item_details: item_details[rate] = {"txval":0, "iamt":0, "camt":0, "samt":0}
                item_details[rate]["txval"] += val
                
            elif _is_tax_ledger(e.ledger):
                # Tax Line
                # We need to attribute this to a rate.
                # If we have multiple rates, it's hard to attribute without item link.
                # Simplified: Distribute proportional? OR assume single rate.
                # For MVP, accumulate total tax and assign to dominant rate?
                # Actually, iterate items to calculate expected tax, and use that?
                pass

        # Calculate or Assign Tax
        # For this MVP, we will auto-calculate Tax based on Rate and place in appropriate bucket (IGST vs CGST/SGST)
        # Based on Place of Supply (Party State vs Org State).
        
        org_state = org.state or "Karnataka"
        party_state = party_ledger.state or org_state
        is_inter_state = (org_state.lower() != party_state.lower())
        
        inv_items = []
        
        for rate, data in item_details.items():
            txval = data["txval"]
            if is_inter_state:
                iamt = txval * (rate / 100)
                camt = 0
                samt = 0
            else:
                iamt = 0
                camt = txval * (rate / 200)
                samt = txval * (rate / 200)
                
            inv_items.append({
                "num": 1, # seq
                "itm_det": {
                   "rt": rate,
                   "txval": txval,
                   "iamt": iamt,
                   "camt": camt,
                   "samt": samt,
                   "csamt": 0
                }
            })
            
        # Construct Invoice Object
        inv_obj = {
            "inum": v.voucher_number,
            "idt": v.date.strftime("%d-%m-%Y"),
            "val": sum(e.amount for e in v.entries if e.is_debit), # Approx Invoice Value
            "pos": _get_state_code(party_state), # Need state code map
            "rchrg": "N",
            "itms": inv_items
        }
        
        if is_b2b:
            # Group by CTIN
            # Check if CTIN exists in b2b list
            ctin = party_ledger.gstin
            existing = next((x for x in b2b if x["ctin"] == ctin), None)
            if existing:
                existing["inv"].append(inv_obj)
            else:
                b2b.append({
                    "ctin": ctin,
                    "inv": [inv_obj]
                })
        else:
            # B2C (Small) - Grouped by POS + Rate (Not Invoice wise usually, but B2CL is invoice wise)
            # Simplified: dumping into B2CS-like list (just inv list doesn't apply to B2CS structure)
            # But let's use B2CL format for simplicity in this artifact
            b2cs.append(inv_obj)

    return {
        "gstin": org.gstin,
        "fp": fp,
        "b2b": b2b,
        "b2cl": [], # ignoring for brevity
        "b2cs": []  #ignoring for brevity
    }

def _get_root_group_name(group):
    curr = group
    while curr.parent:
        curr = curr.parent
    return curr.name

def _is_sales_ledger(ledger):
    # Check if under "Sales Accounts"
    return _get_root_group_name(ledger.group) == "Sales Accounts" or ledger.group.name == "Sales Accounts"

def _is_tax_ledger(ledger):
    return _get_root_group_name(ledger.group) == "Duties & Taxes"

def _get_state_code(state_name):
    # Mock Map
    mapping = {
        "karnataka": "29",
        "maharashtra": "27",
        "delhi": "07"
    }
    return mapping.get(state_name.lower(), "00")
