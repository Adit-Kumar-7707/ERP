from sqlalchemy.orm import Session
from app.modules.gst.models import TaxRate, ItemTaxConfig
from app.modules.inventory.models import StockItem
from app.modules.organization.models import Organization
from app.modules.accounting.models import Account, AccountType
from app.modules.vouchers import schemas
from typing import Tuple, Dict

def get_or_create_gst_ledger(db: Session, name: str, code: str, group_id: int = None) -> Account:
    """
    Finds or creates a GST Ledger.
    """
    acc = db.query(Account).filter(Account.name == name).first()
    if not acc:
        # Create
        # Need a parent group? For now flat or under "Duties & Taxes" if exists.
        # Assuming flat for MVP Part 4.
        acc = Account(
            name=name,
            code=code,
            type=AccountType.LIABILITY # Duties are Liabilities (net off Asset)
        )
        db.add(acc)
        db.commit()
        db.refresh(acc)
    return acc

def get_gst_ledgers(db: Session, voucher_type_group: str) -> Dict[str, Account]:
    """
    Returns dict of ledgers: cgst, sgst, igst.
    For Sales: Output Tax.
    For Purchase: Input Tax.
    """
    prefix = "Output" if voucher_type_group.lower() == "sales" else "Input"
    
    return {
        "cgst": get_or_create_gst_ledger(db, f"{prefix} CGST", f"{prefix}_CGST"),
        "sgst": get_or_create_gst_ledger(db, f"{prefix} SGST", f"{prefix}_SGST"),
        "igst": get_or_create_gst_ledger(db, f"{prefix} IGST", f"{prefix}_IGST"),
    }

def is_inter_state(org_state_code: str, party_state_code: str) -> bool:
    if not org_state_code or not party_state_code:
        return False # Default to Intra if unknown? Or need rule. Tally defaults to Local.
    return org_state_code != party_state_code

def calculate_item_tax(
    db: Session, 
    item_id: int, 
    taxable_value: float, 
    is_inter: bool
) -> Tuple[float, float, float, float]:
    """
    Returns (cgst_amt, sgst_amt, igst_amt, total_tax).
    """
    # 1. Get Tax Rate for Item
    config = db.query(ItemTaxConfig).filter(ItemTaxConfig.stock_item_id == item_id).first()
    if not config:
        return 0.0, 0.0, 0.0, 0.0
        
    rate = config.tax_rate
    
    if is_inter:
        # IGST
        igst = taxable_value * (rate.igst_percent / 100.0)
        return 0.0, 0.0, igst, igst
    else:
        # Intra
        cgst = taxable_value * (rate.cgst_percent / 100.0)
        sgst = taxable_value * (rate.sgst_percent / 100.0)
        return cgst, sgst, 0.0, cgst + sgst

def apply_gst_to_voucher(db: Session, entry_in: schemas.VoucherEntryCreate):
    """
    Enriches the voucher with GST Charges.
    Mutates entry_in.charges.
    """
    # 1. Get Org and Party State
    org = db.query(Organization).first()
    if not org or not org.state_code:
        # Skip GST if Org not setup
        return
        
    party = db.query(Account).filter(Account.id == entry_in.party_ledger_id).first()
    if not party:
        return
        
    # Check if Party has state code, else assume local?
    party_state = party.state_code or org.state_code
    
    is_inter = is_inter_state(org.state_code, party_state)
    
    # 2. Get Ledgers
    v_group = "sales" # Default? Need to know type.
    # We can't easily get VoucherType group here without querying.
    # passed entry_in has voucher_type_id
    from app.modules.vouchers.models import VoucherType
    vt = db.query(VoucherType).filter(VoucherType.id == entry_in.voucher_type_id).first()
    if not vt:
         return
         
    v_group = vt.type_group.lower()
    if v_group not in ["sales", "purchase"]:
        return
        
    ledgers = get_gst_ledgers(db, v_group)
    
    # 3. Iterate Items
    total_cgst = 0.0
    total_sgst = 0.0
    total_igst = 0.0
    
    for item in entry_in.items or []:
        # Auto-calc amount if missing
        val = item.amount
        if val == 0 and item.qty > 0:
            val = item.qty * item.rate
            
        # Discount
        val -= item.discount_amount
        
        c, s, i, t = calculate_item_tax(db, item.item_id, val, is_inter)
        total_cgst += c
        total_sgst += s
        total_igst += i
        
    # 4. Add Charges
    # Note: We should aggregate same-ledger charges? Or one line per tax type?
    # Standard: One line per tax type for the whole voucher (Summary).
    # Line-level tax is usually stored in metadata or hidden linkage. 
    # For Journal Posting, Summary is sufficient.
    
    charges = entry_in.charges or []
    
    if total_cgst > 0:
        charges.append(schemas.VoucherChargeCreate(
            ledger_id=ledgers["cgst"].id,
            amount=total_cgst,
            charge_type="CGST"
        ))
    if total_sgst > 0:
        charges.append(schemas.VoucherChargeCreate(
            ledger_id=ledgers["sgst"].id,
            amount=total_sgst,
            charge_type="SGST"
        ))
    if total_igst > 0:
        charges.append(schemas.VoucherChargeCreate(
            ledger_id=ledgers["igst"].id,
            amount=total_igst,
            charge_type="IGST"
        ))
        
    entry_in.charges = charges
