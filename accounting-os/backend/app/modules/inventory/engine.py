from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.inventory.models import StockLedgerEntry, StockItem, ValuationMethod
from app.modules.vouchers.models import VoucherEntry
from datetime import date

def get_weighted_average_rate(db: Session, item_id: int, up_to_date: date) -> float:
    """
    Calculates Weighted Average Cost Rate up to a specific date.
    Formula: Total Value (In) / Total Qty (In) - theoretically?
    Actually for Perpetual Weighted Average:
    We usually need the running balance rate at that moment.
    Simple Approx: Sum(Value In - Value Out) / Sum(Qty In - Qty Out).
    But "Value Out" depends on the rate! Circular dependency if recomputing?
    
    Standard Approach:
    Rate = (Opening Value + Sum of Purchase Values) / (Opening Qty + Sum of Purchase Qty)
    This gives the "Average Cost" of all available inventory.
    """
    
    # Get all Inward entries (Purchases + Opening)
    # Filter by date? Perpetual implies rate changes over time.
    # To be strictly correct for today's transaction, we need the state *before* this transaction.
    
    # Sum of all Inwards
    inwards = db.query(
        func.sum(StockLedgerEntry.qty_in).label("total_qty"),
        func.sum(StockLedgerEntry.value).label("total_value")
    ).filter(
        StockLedgerEntry.stock_item_id == item_id,
        StockLedgerEntry.qty_in > 0,
        StockLedgerEntry.date <= up_to_date # Include today? Ordering matters within day.
    ).first()
    
    total_qty_in = inwards.total_qty or 0
    total_value_in = inwards.total_value or 0
    
    # We also need to account for previous Outwards to know *current* stock composition?
    # In Weighted Average, Cost of Goods Sold reduces value proportionally.
    # New Rate = (Current Value) / (Current Qty).
    # Current Value = (Prev Value - Cost of Sales + New Purchases).
    
    # Let's try "Running Balance" query logic or just "All Inwards" approach (Periodic Avg)?
    # User request "Perpetual Inventory".
    # Perpetual: Rate is re-calculated after every purchase.
    # For a Sale, we use the *current* rate.
    
    # Implementation:
    # Fetch current balance (Qty, Value) from ledger *excluding* current voucher if possible.
    # Since we are posting *new* ledger entries, we query *everything before this*.
    
    # Calculate Balance Qty & Value from Ledger
    # NOTE: 'value' column in Ledger for OUT entries is the COGS (negative or positive reduction).
    # So Sum(value) should give Current Stock Value.
    
    stats = db.query(
        func.sum(StockLedgerEntry.qty_in - StockLedgerEntry.qty_out).label("bal_qty"),
        func.sum(StockLedgerEntry.value - StockLedgerEntry.cost_value).label("bal_val") 
        # Note: In our model, 'value' is Transaction Value (Buy Cost). 
        # 'cost_value' is COGS for Sales.
        # Net Value = Sum(Value In) - Sum(COGS Out).
    ).filter(
        StockLedgerEntry.stock_item_id == item_id,
        StockLedgerEntry.date <= up_to_date
        # Ideally exclude current voucher ID to avoid self-ref if re-running
    ).first()
    
    bal_qty = stats.bal_qty or 0
    bal_val = stats.bal_val or 0
    
    if bal_qty <= 0:
        return 0.0
        
    return bal_val / bal_qty

def get_fifo_cost(db: Session, item_id: int, qty_needed: float) -> float:
    """
    Calculates COGS for `qty_needed` using FIFO.
    Matches against earliest Unconsumed Inward entries.
    """
    # 1. Get all Inwards ordered by Date ASC
    inwards = db.query(StockLedgerEntry).filter(
        StockLedgerEntry.stock_item_id == item_id,
        StockLedgerEntry.qty_in > 0
    ).order_by(StockLedgerEntry.date.asc(), StockLedgerEntry.id.asc()).all()
    
    # 2. Get all Outwards (Consumed qty)
    # We need to assume Inwards are consumed sequentially.
    total_consumed = db.query(func.sum(StockLedgerEntry.qty_out)).filter(
        StockLedgerEntry.stock_item_id == item_id,
        StockLedgerEntry.qty_out > 0
    ).scalar() or 0
    
    # 3. Skip already consumed quantity
    total_cost = 0.0
    qty_left_to_account = qty_needed
    
    # Fast forward consumption
    remaining_in_batch = 0
    
    for batch in inwards:
        batch_qty = batch.qty_in
        
        # If this batch is fully consumed by previous sales
        if total_consumed >= batch_qty:
            total_consumed -= batch_qty
            continue
            
        # Partial consumption of this batch?
        available_in_batch = batch_qty - total_consumed
        total_consumed = 0 # Consumed debt paid off
        
        take_qty = min(available_in_batch, qty_left_to_account)
        
        # Add cost
        # Rate per unit for this batch = batch.value / batch.qty_in
        batch_rate = batch.value / batch.qty_in if batch.qty_in else 0
        total_cost += take_qty * batch_rate
        
        qty_left_to_account -= take_qty
        
        if qty_left_to_account <= 0:
            break
            
    return total_cost


def post_stock_ledger(db: Session, voucher: VoucherEntry):
    """
    Processes a Voucher and creates Stock Ledger Entries.
    Handles Valuation (COGS) for Sales.
    """
    # Clear existing entries for this voucher (Idempotency)
    db.query(StockLedgerEntry).filter(StockLedgerEntry.voucher_id == voucher.id).delete()
    
    # Process Line Items
    for item in voucher.items:
        if not item.item_id:
            continue
            
        stock_item = db.query(StockItem).filter(StockItem.id == item.item_id).first()
        if not stock_item:
            continue
            
        # Determine Direction based on Voucher Group
        # Sales = Out, Purchase = In
        
        v_type_group = voucher.voucher_type.type_group.lower()
        
        qty_in = 0.0
        qty_out = 0.0
        entry_value = 0.0 # Transaction Value (Inwards)
        cost_value = 0.0 # COGS (Outwards)
        
        if v_type_group == "purchase":
            qty_in = item.qty
            # For Purchase, Value = Transaction Amount
            entry_value = item.amount
            
            # Create Entry
            entry = StockLedgerEntry(
                date=voucher.journal_entry.date,
                stock_item_id=item.item_id,
                voucher_id=voucher.id,
                qty_in=qty_in,
                qty_out=0,
                rate=item.rate,
                value=entry_value,
                cost_value=0 # No COGS for purchase
            )
            db.add(entry)
            
        elif v_type_group == "sales":
            qty_out = item.qty
            
            # For Sales, we must COMPUTE COGS (Cost Value)
            # based on Valuation Method.
            
            method = stock_item.valuation_method or ValuationMethod.WEIGHTED_AVERAGE
            
            if method == ValuationMethod.FIFO:
                cost_value = get_fifo_cost(db, item.item_id, qty_out)
            else:
                # Weighted Average
                # Get current rate
                rate = get_weighted_average_rate(db, item.item_id, voucher.journal_entry.date)
                cost_value = qty_out * rate
            
            entry = StockLedgerEntry(
                date=voucher.journal_entry.date,
                stock_item_id=item.item_id,
                voucher_id=voucher.id,
                qty_in=0,
                qty_out=qty_out,
                rate=item.rate, # Sales Rate (Revenue) - not stored in 'value' usually? 
                # Actually, Stock Ledger usually tracks COST.
                # Sales Rate is in Voucher.
                # Let's store Sales Value in 'value' for reference? 
                # Or keep 'value' strictly for Inventory Value (Cost)?
                # Standard: Stock Ledger tracks INVENTORY VALUE.
                # So for OUT: 'value' (asset reduction) = -COGS.
                # But we have separate column 'cost_value'.
                # Let's say:
                # value = Transaction Value (Purchase Cost / Sales Revenue - irrelevant for stock val?)
                # cost_value = The Accounting Cost Reduction.
                
                value=item.amount, # Store Sales Revenue for reference if needed
                cost_value=cost_value
            )
            db.add(entry)
            
    db.flush()
