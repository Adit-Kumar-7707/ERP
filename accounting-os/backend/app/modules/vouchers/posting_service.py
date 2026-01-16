from sqlalchemy.orm import Session
from app.modules.vouchers import schemas, models
from app.modules.accounting.models import JournalEntry, JournalLine, Account, AccountType
from fastapi import HTTPException
from datetime import date

def calculate_voucher_totals(entry_in: schemas.VoucherEntryCreate):
    """
    Computes Net, Tax, Total from Items and Charges.
    """
    net_total = 0.0
    for item in entry_in.items or []:
        # Ensure Item Amount is calculated if missing (Backend Re-calc)
        if item.amount == 0 and item.qty > 0:
            item.amount = item.qty * item.rate
        net_total += item.amount - item.discount_amount

    # Tax calculation
    tax_total = 0.0
    charge_total_net = 0.0 # Nontax charges
    
    for charge in entry_in.charges or []:
        c_type = (charge.charge_type or "").upper()
        if "GST" in c_type:
             tax_total += charge.amount
        else:
             charge_total_net += charge.amount

    grand_total = net_total + tax_total + charge_total_net
    
    return net_total, tax_total, grand_total

def generate_journal_lines(
    db: Session,
    entry_in: schemas.VoucherEntryCreate, 
    voucher_type_group: str,
    grand_total: float,
    voucher_date: date
) -> list[JournalLine]:
    """
    Generates Dr/Cr lines with Perpetual Inventory Integration.
    """
    from app.modules.inventory.models import StockItem
    from app.modules.inventory.engine import get_weighted_average_rate, get_fifo_cost, ValuationMethod

    if not entry_in.party_ledger_id:
        raise HTTPException(status_code=400, detail="Party Ledger is required for Real Vouchers")

    j_lines = []
    
    # 1. Handle Sales
    if voucher_type_group.lower() == "sales":
        # Dr Party (Total Receivable)
        j_lines.append(JournalLine(
            account_id=entry_in.party_ledger_id,
            debit=grand_total,
            credit=0,
            description=f"Sales Invoice"
        ))
        
        for item in entry_in.items or []:
            if not item.ledger_id:
                 raise HTTPException(status_code=400, detail=f"Sales Ledger missing for item {item.description}")
            
            line_amount = item.amount - item.discount_amount
            
            # 1a. Credit Revenue (Sales)
            j_lines.append(JournalLine(
                account_id=item.ledger_id,
                debit=0,
                credit=line_amount,
                description=f"{item.description} (Qty: {item.qty} @ {item.rate})"
            ))
            
            # 1b. COGS & Inventory Reduction (Perpetual Inventory)
            if item.item_id:
                stock_item = db.query(StockItem).filter(StockItem.id == item.item_id).first()
                if stock_item:
                    # Calculate Cost
                    cost_val = 0.0
                    method = stock_item.valuation_method or ValuationMethod.WEIGHTED_AVERAGE
                    
                    if method == ValuationMethod.FIFO:
                        cost_val = get_fifo_cost(db, item.item_id, item.qty)
                    else:
                        rate = get_weighted_average_rate(db, item.item_id, voucher_date)
                        cost_val = item.qty * rate
                    
                    # Post if Accounts Configured
                    if stock_item.cogs_account_id and stock_item.inventory_account_id and cost_val > 0:
                        # Dr COGS
                        j_lines.append(JournalLine(
                            account_id=stock_item.cogs_account_id,
                            debit=cost_val,
                            credit=0,
                            description=f"Cost of Sales - {item.description}"
                        ))
                        # Cr Inventory Asset
                        j_lines.append(JournalLine(
                            account_id=stock_item.inventory_account_id,
                            debit=0,
                            credit=cost_val,
                            description=f"Stock Out - {item.description}"
                        ))

        # Cr Charges
        for charge in entry_in.charges or []:
            j_lines.append(JournalLine(
                account_id=charge.ledger_id,
                debit=0,
                credit=charge.amount,
                description=charge.charge_type or "Charge"
            ))

    # 2. Handle Purchase
    elif voucher_type_group.lower() == "purchase":
        # Cr Party
        j_lines.append(JournalLine(
            account_id=entry_in.party_ledger_id,
            debit=0,
            credit=grand_total,
            description=f"Purchase Bill"
        ))
        
        for item in entry_in.items or []:
             if not item.ledger_id:
                 raise HTTPException(status_code=400, detail=f"Purchase Ledger missing for item {item.description}")
             
             line_amount = item.amount - item.discount_amount
             
             # If Item is linked to Inventory Asset Account, we should Debit THAT.
             # But user selected 'ledger_id' in UI. 
             # If UI selected "Purchase Expense", and we want "Inventory Asset", we have a conflict if we blindly use line.ledger_id
             # Strategy: If StockItem has `inventory_account_id`, use THAT for Debit. 
             # Ignore `line.ledger_id`? Or use `line.ledger_id` as the Target?
             # For flexibility, trust `line.ledger_id` typically. 
             # BUT "Accounting-Grade" implies we route correctly.
             # If line.ledger_id IS the purchase expense, and we want Asset...
             # Let's check: Pydantic model has item.item_id.
             
             debit_acc_id = item.ledger_id
             desc = f"{item.description}"
             
             if item.item_id:
                 stock_item = db.query(StockItem).filter(StockItem.id == item.item_id).first()
                 if stock_item and stock_item.inventory_account_id:
                     # Override with Inventory Asset Account for Perpetual
                     debit_acc_id = stock_item.inventory_account_id
                     desc = f"Stock In - {item.description}"
             
             j_lines.append(JournalLine(
                account_id=debit_acc_id,
                debit=line_amount,
                credit=0,
                description=desc
            ))
            
        # Dr Charges
        for charge in entry_in.charges or []:
            j_lines.append(JournalLine(
                account_id=charge.ledger_id,
                debit=charge.amount,
                credit=0,
                description=charge.charge_type or "Charge"
            ))

    else:
        # Stock Journal / Others
        pass # To be implemented in 4.4.4 if needed, usually handled by manual lines or specific logic

    return j_lines
def reverse_journal_entry(db: Session, original_entry: JournalEntry, reversal_date: date, reason: str = "Reversal"):
    """
    Creates a reversal entry for the given journal entry.
    """
    reversal = JournalEntry(
        date=reversal_date,
        voucher_type="Contra" if original_entry.voucher_type == "Contra" else "Journal", # Or keep original type? Usually "Journal" or same type with flag.
        reference=f"REV-{original_entry.reference}",
        narration=f"Reversal of {original_entry.reference}: {reason}",
        financial_year_id=original_entry.financial_year_id, # Should be current FY? Assuming same for now.
        is_system_entry=True
    )
    db.add(reversal)
    db.flush()
    
    for line in original_entry.lines:
        # Swap Dr/Cr
        rev_line = JournalLine(
            entry_id=reversal.id,
            account_id=line.account_id,
            debit=line.credit, # Swap
            credit=line.debit, # Swap
            description=f"Reversal - {line.description}"
        )
        db.add(rev_line)
        
    return reversal
