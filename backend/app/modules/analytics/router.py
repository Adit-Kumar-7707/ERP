from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload
from app.core.db import get_db
from app.modules.accounting import models
from app.modules.accounting.models import AccountGroup, Ledger, Voucher, VoucherEntry
from app.modules.analytics.schemas import BalanceSheetResponse, BalanceSheetItem

router = APIRouter()

@router.get("/balance-sheet", response_model=BalanceSheetResponse)
def get_balance_sheet(to_date: Optional[date] = None, db: Session = Depends(get_db)):
    """
    Calculates Balance Sheet.
    Logic:
    1. Fetch all Groups & Ledgers.
    2. Calculate Net Balance for each Group (Recursive).
    3. Separate into Assets and Liabilities.
    4. Calculate P&L for Retained Earnings.
    """
    
    # 1. Get all ledgers with their entries
    # ledgers = db.query(Ledger).options(selectinload(Ledger.entries)).all()
    # We must join entries and voucher to filter by date
    
    # Optimization: Loading all ledgers is fine, but entries need filtering.
    # Python side filtering for now as lazy loading logic.
    ledgers = db.query(Ledger).options(selectinload(Ledger.entries)).all()
    ledger_map = {}
    
    target_date = to_date if to_date else date.today()
    
    for l in ledgers:
        relevant = [e for e in l.entries if e.voucher.date <= target_date]
        dr = sum(e.amount for e in relevant if e.is_debit)
        cr = sum(e.amount for e in relevant if not e.is_debit)
        net = l.opening_balance + (dr - cr)
        ledger_map[l.id] = net

    # 2. Build Group Tree
    groups = db.query(AccountGroup).options(selectinload(AccountGroup.children), selectinload(AccountGroup.ledgers)).all()
    
    def get_group_balance(g):
        total = 0
        # Add Ledgers
        for l in g.ledgers:
            bal = ledger_map.get(l.id, 0)
            total += bal
            
        # Add Children
        for c in g.children:
            total += get_group_balance(c)
            
        return total

    # 3. Roots
    assets = []
    liabilities = []
    
    roots = [g for g in groups if g.parent_id is None]
    
    for r in roots:
        bal = get_group_balance(r)
        # Tally Display Logic:
        # Assets side: Positive Balances (Dr)
        # Liab side: Negative Balances (Cr)
        # But we need absolute values for display.
        
        item = BalanceSheetItem(name=r.name, balance=abs(bal))
        
        if r.name == "Assets":
            assets.append(item)
        elif r.name == "Liabilities":
            liabilities.append(item)
            
    # Calculate P&L (Income - Expense)
    income_root = next((g for g in roots if g.name == "Income"), None)
    expense_root = next((g for g in roots if g.name == "Expenses"), None)
    
    inc_bal = get_group_balance(income_root) if income_root else 0 # usually Cr (-)
    exp_bal = get_group_balance(expense_root) if expense_root else 0 # usually Dr (+)
    
    net_pl = inc_bal + exp_bal
    
    pl_item = BalanceSheetItem(name="Profit & Loss A/c", balance=abs(net_pl))
    
    # P&L Logic:
    # If Net PL is Credit (Negative) -> Profit -> Liability Side
    # If Net PL is Debit (Positive) -> Loss -> Asset Side
    if net_pl < 0: 
         liabilities.append(pl_item)
    else:
         assets.append(pl_item)
         
    return {
        "liabilities": liabilities,
        "assets": assets,
        "total_liabilities": sum(i.balance for i in liabilities),
        "total_assets": sum(i.balance for i in assets),
        "diff": 0 
    }

from app.modules.inventory.models import StockItem
from app.modules.accounting.models import VoucherEntry
from app.modules.analytics.schemas import StockSummaryResponse, StockSummaryItem

@router.get("/stock-summary", response_model=StockSummaryResponse)
def get_stock_summary(db: Session = Depends(get_db)):
    # Fetch all items (Naive implementation)
    items = db.query(StockItem).all()
    summary = []
    
    # Pre-fetch entries? Better to query group.
    # For MVP, iterate.
    for item in items:
        entries = db.query(VoucherEntry).filter(VoucherEntry.stock_item_id == item.id).all()
        
        inward_qty = sum(e.quantity for e in entries if e.is_debit)
        outward_qty = sum(e.quantity for e in entries if not e.is_debit)
        
        closing_qty = item.opening_qty + inward_qty - outward_qty
        
        # Simple Valuation: Closing Qty * Rate?
        # If we have opening rate, use it.
        closing_value = closing_qty * item.opening_rate 
        
        if closing_qty != 0:
            summary.append(StockSummaryItem(
                name=item.name,
                closing_qty=closing_qty,
                closing_value=closing_value
            ))
            
    return {"items": summary}


def calculate_stock_value_at(db: Session, target_date: date) -> float:
    # Value = Opening Qty * Opening Rate 
    #       + (Inwards Qty * Rate) - (Outwards Qty * Rate) ... complex valuation (FIFO/Avg).
    # MVP: Value = (Opening Qty + Inwards - Outwards) * Opening Rate.
    # We must filter entries <= target_date.
    
    items = db.query(StockItem).all()
    total_value = 0.0
    
    for item in items:
        # Filter entries before or on target_date
        entries = db.query(VoucherEntry).join(VoucherEntry.voucher).filter(
            VoucherEntry.stock_item_id == item.id,
            Voucher.date <= target_date
        ).all()
        
        inward_qty = sum(e.quantity for e in entries if e.is_debit)
        outward_qty = sum(e.quantity for e in entries if not e.is_debit)
        current_qty = item.opening_qty + inward_qty - outward_qty
        
        total_value += current_qty * item.opening_rate
        
    return total_value

@router.get("/pl", response_model=PLResponse)
def get_profit_loss(
    from_date: Optional[date] = None, 
    to_date: Optional[date] = None, 
    db: Session = Depends(get_db)
):
    # Defaults
    if not to_date: to_date = date.today()
    if not from_date: from_date = date(to_date.year, 4, 1) # Default to Apr 1 logic if missing? Or just None?
    # Actually if from_date is missing, maybe assume beginning of time?
    # Tally context sends Apr 1 usually.
    
    # 1. Calculate Ledger Balances FOR THE PERIOD
    ledgers = db.query(Ledger).options(selectinload(Ledger.entries)).all()
    ledger_period_map = {}
    
    for l in ledgers:
        # Filter entries in range
        if l.entries:
            # We need to filter entries by date. 
            # Doing in Python for now as we fetched selectinload. 
            # Ideally do dynamic query but optimization later.
            relevant_entries = [
                e for e in l.entries 
                if (not from_date or e.voucher.date >= from_date) and (e.voucher.date <= to_date)
            ]
            dr = sum(e.amount for e in relevant_entries if e.is_debit)
            cr = sum(e.amount for e in relevant_entries if not e.is_debit)
            # For P&L (Revenue/Expense), we ONLY care about Period Movement.
            # Opening Balance of Expense/Income ledgers is usually 0 at new year.
            # But if from_date > start_of_books, we ignore previous checks.
            ledger_period_map[l.id] = (dr - cr)
        else:
             ledger_period_map[l.id] = 0

    groups = db.query(AccountGroup).options(selectinload(AccountGroup.children), selectinload(AccountGroup.ledgers)).all()
    
    def get_group_val_period(name: str):
        g = next((x for x in groups if x.name == name), None)
        if not g: return 0.0
        
        def calc(grp):
            tot = sum(ledger_period_map.get(l.id, 0) for l in grp.ledgers)
            for ch in grp.children:
                tot += calc(ch)
            return tot
        return calc(g)

    # 2. Components
    # Expenses (Dr is positive)
    purchase_ac = get_group_val_period("Purchase Accounts") # Dr
    direct_exp = get_group_val_period("Direct Expenses") # Dr
    indirect_exp = get_group_val_period("Indirect Expenses") # Dr
    
    # Incomes (Cr is negative usually, convert to positive for display)
    sales_ac = abs(get_group_val_period("Sales Accounts")) 
    direct_inc = abs(get_group_val_period("Direct Incomes"))
    indirect_inc = abs(get_group_val_period("Indirect Incomes"))
    
    # Stock
    # Opening Stock: Value AT from_date - 1 day? 
    # Effectively Closing Stock of (from_date - 1).
    from datetime import timedelta
    yesterday = from_date - timedelta(days=1)
    
    opening_stock = calculate_stock_value_at(db, yesterday)
    closing_stock = calculate_stock_value_at(db, to_date)
    
    # 3. Totals
    expenses_list = [
        PLItem(name="Purchase Accounts", amount=purchase_ac),
        PLItem(name="Direct Expenses", amount=direct_exp),
        PLItem(name="Indirect Expenses", amount=indirect_exp),
    ]
    
    incomes_list = [
        PLItem(name="Sales Accounts", amount=sales_ac),
        PLItem(name="Direct Incomes", amount=direct_inc),
        PLItem(name="Indirect Incomes", amount=indirect_inc),
    ]
    
    total_exp = opening_stock + purchase_ac + direct_exp + indirect_exp
    total_inc = sales_ac + direct_inc + indirect_inc + closing_stock
    
    net_profit = total_inc - total_exp
    
    return {
        "expenses": expenses_list,
        "incomes": incomes_list,
        "opening_stock": opening_stock,
        "closing_stock": closing_stock,
        "net_profit": net_profit,
        "total_expenses": total_exp, 
        "total_incomes": total_inc
    }

from app.modules.analytics.schemas import GroupSummaryResponse, GroupSummaryItem

@router.get("/group-summary/{group_name}", response_model=GroupSummaryResponse)
def get_group_summary(
    group_name: str, 
    from_date: Optional[date] = None, 
    to_date: Optional[date] = None, 
    db: Session = Depends(get_db)
):
    if not to_date: to_date = date.today()

    # 1. Reuse Balance Calc Logic (Should be refactored)
    # Filter entries based on provided dates.
    # If from_date is None, implies start of time (As Of to_date).
    
    ledgers = db.query(Ledger).options(selectinload(Ledger.entries)).all()
    ledger_map = {}
    
    for l in ledgers:
        if l.entries:
            relevant = [
                e for e in l.entries 
                if (not from_date or e.voucher.date >= from_date) and (e.voucher.date <= to_date)
            ]
            dr = sum(e.amount for e in relevant if e.is_debit)
            cr = sum(e.amount for e in relevant if not e.is_debit)
            
            # Opening Balance handling:
            # If from_date is present, Opening Balance for "Period" is (Actual Opening + Trans < From).
            # If from_date is None, Opening Balance is Actual Opening.
            # However, for P&L items (Rev/Exp), we usually ignore Opening if distinct period?
            # Let's keep it simple: Balance = Opening (if no from_date) + (Dr - Cr).
            # If from_date is set, we are looking at "Movement" + "Opening as of From"?
            # Tally Group Summary shows: Opening (as of from), Transactions, Closing.
            # Our Response Schema only has 'balance'.
            # Let's just return SUM(Relevant Entries) for now?
            # If I drill from BS (from=None), I want (Opening + All Trans).
            # If I drill from PL (from=Apr1), I want (All Trans Apr1-Mar31). (Opening usually 0 for Exp).
            
            # Logic:
            # If from_date is None (BS mode): Use l.opening_balance + (Dr-Cr).
            # If from_date is Set (PL mode): Use (Dr-Cr) only? 
            # (Assuming Expenses don't have b/f balance in MVP without closing entries).
            
            if from_date:
                net = (dr - cr) # Just movement
            else:
                net = l.opening_balance + (dr - cr) # Cumulative
            
            ledger_map[l.id] = net
        else:
             ledger_map[l.id] = l.opening_balance if not from_date else 0

    groups = db.query(AccountGroup).options(selectinload(AccountGroup.children), selectinload(AccountGroup.ledgers)).all()
    
    def get_group_val_recursive(g):
        tot = sum(ledger_map.get(l.id, 0) for l in g.ledgers)
        for ch in g.children:
            tot += get_group_val_recursive(ch)
        return tot

    # 2. Find Target Group
    target = next((g for g in groups if g.name == group_name), None)
    if not target:
        # Check if it is "Profit & Loss A/c" -> Special Case?
        # Or maybe User clicked "Assets" (Standard Tally Group does exist).
        return GroupSummaryResponse(group_name=group_name, items=[], total_debit=0, total_credit=0)
        
    items = []
    
    # 3. Add Sub-Groups
    for child in target.children:
        bal = get_group_val_recursive(child)
        if bal != 0:
            items.append(GroupSummaryItem(
                id=child.id,
                name=child.name,
                type="group",
                balance=abs(bal),
                is_debit=bal >= 0
            ))
            
    # 4. Add Direct Ledgers
    for l in target.ledgers:
        bal = ledger_map.get(l.id, 0)
        if bal != 0:
             items.append(GroupSummaryItem(
                id=l.id,
                name=l.name,
                type="ledger",
                balance=abs(bal),
                is_debit=bal >= 0
            ))
            
    return GroupSummaryResponse(
        group_name=group_name,
        items=items,
        total_debit=sum(i.balance for i in items if i.is_debit),
        total_credit=sum(i.balance for i in items if not i.is_debit)
    )

from app.modules.analytics.schemas import RatioAnalysisResponse, CashFlowResponse, MonthlyFlow

@router.get("/ratio-analysis", response_model=RatioAnalysisResponse)
def get_ratio_analysis(db: Session = Depends(get_db)):
    # Calculate Components using existing logic (simplified)
    # Ideally, refactor Shared Logic into a Service. For MVP, we instantiate helper logic here or call internal functions?
    # Python internal calls are cheap.
    
    # 1. Get Balance Sheet Components
    bs = get_balance_sheet(db=db)
    
    # Extract Values from BS Response (This is inefficient but clean code-wise for MVP)
    # We need to find "Current Assets" and "Current Liabilities" groups
    
    def find_val(items, name):
        # Recursive search
        for i in items:
            if i.name == name: return i.balance
            if i.children:
                val = find_val(i.children, name)
                if val is not None: return val
        return 0.0

    current_assets = find_val(bs["assets"], "Current Assets")
    current_liabilities = find_val(bs["liabilities"], "Current Liabilities")
    
    loans_liability = find_val(bs["liabilities"], "Loans (Liability)")
    capital_account = find_val(bs["liabilities"], "Capital Account")
    
    # 2. Get P&L Components
    pl = get_profit_loss(db=db)
    
    # Sales
    sales_item = next((x for x in pl["incomes"] if x.name == "Sales Accounts"), None)
    sales = sales_item.amount if sales_item else 0.0
    
    gross_profit = pl["total_incomes"] - pl["total_expenses"] # Rough approx if we don't separate Gross/Net cleanly in PL function
    # Wait, our PL function returns 'Net Profit'.
    # Gross Profit = (Sales + Direct Inc + Closing Stock) - (Opening Stock + Purchase + Direct Exp)
    # Our PL response has breakdown.
    
    direct_inc_val = next((x.amount for x in pl["incomes"] if x.name == "Direct Incomes"), 0)
    direct_exp_val = next((x.amount for x in pl["expenses"] if x.name == "Direct Expenses"), 0)
    purchase_val = next((x.amount for x in pl["expenses"] if x.name == "Purchase Accounts"), 0)
    
    gross_income = sales + direct_inc_val + pl["closing_stock"]
    gross_exp = pl["opening_stock"] + purchase_val + direct_exp_val
    gross_profit_val = gross_income - gross_exp
    
    net_profit_val = pl["net_profit"]
    
    # Ratios
    wc = current_assets - current_liabilities
    cr = (current_assets / current_liabilities) if current_liabilities else 0
    # Quick Ratio: (Current Assets - Stock) / Current Liabilities
    # We need Stock Value.
    stock_val = pl["closing_stock"]
    qr = ((current_assets - stock_val) / current_liabilities) if current_liabilities else 0
    
    debt_equity = (loans_liability / capital_account) if capital_account else 0
    
    gp_percent = (gross_profit_val / sales) * 100 if sales else 0
    np_percent = (net_profit_val / sales) * 100 if sales else 0
    
    return RatioAnalysisResponse(
        working_capital=wc,
        current_ratio=cr,
        quick_ratio=qr,
        debt_equity_ratio=debt_equity,
        gross_profit_percent=gp_percent,
        net_profit_percent=np_percent,
        return_on_working_capital=(net_profit_val / wc) * 100 if wc else 0
    )

@router.get("/cash-flow", response_model=CashFlowResponse)
def get_cash_flow(db: Session = Depends(get_db)):
    """
    Monthly Summary of Cash/Bank Inflow/Outflow.
    """
    from sqlalchemy import extract
    
    # 1. Identify Cash/Bank Ledgers
    # We find groups "Cash-in-Hand" and "Bank Accounts"
    target_groups = ["Cash-in-Hand", "Bank Accounts"]
    all_groups = db.query(AccountGroup).all()
    
    target_ids = []
    
    def collect_ids(g_name):
        g = next((x for x in all_groups if x.name == g_name), None)
        if g:
            # Get all childrens recursive
            ids = [g.id]
            # Simple recursive closure
            def get_children(pid):
                children = [x for x in all_groups if x.parent_id == pid]
                for c in children:
                    ids.append(c.id)
                    get_children(c.id)
            get_children(g.id)
            return ids
        return []

    for name in target_groups:
        target_ids.extend(collect_ids(name))
        
    cash_ledgers = db.query(Ledger).filter(Ledger.group_id.in_(target_ids)).all()
    cash_ledger_ids = [l.id for l in cash_ledgers]
    
    if not cash_ledger_ids:
        return CashFlowResponse(items=[], total_inflow=0, total_outflow=0, net_flow=0)
        
    # 2. Query Entries
    entries = db.query(VoucherEntry).filter(VoucherEntry.ledger_id.in_(cash_ledger_ids)).all()
    
    # 3. Group by Month
    from collections import defaultdict
    monthly = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    
    for e in entries:
        m_key = e.voucher.date.strftime("%Y-%m") # 2024-04
        if e.is_debit:
            # Debit to Cash = Receipt (Inflow)
            monthly[m_key]["in"] += e.amount
        else:
            # Credit to Cash = Payment (Outflow)
            monthly[m_key]["out"] += e.amount
            
    # Format
    items = []
    keys = sorted(monthly.keys())
    
    tot_in = 0
    tot_out = 0
    
    for k in keys:
        i = monthly[k]["in"]
        o = monthly[k]["out"]
        items.append(MonthlyFlow(
            month=k,
            inflow=i,
            outflow=o,
            net=i-o
        ))
        tot_in += i
        tot_out += o
        
    return CashFlowResponse(
        items=items,
        total_inflow=tot_in,
        total_outflow=tot_out,
        net_flow=tot_in - tot_out
    )

from app.modules.analytics.schemas import TrialBalanceResponse, TrialBalanceItem

@router.get("/trial-balance", response_model=TrialBalanceResponse)
def get_trial_balance(
    from_date: Optional[date] = None, 
    to_date: Optional[date] = None, 
    db: Session = Depends(get_db)
):
    if not to_date: to_date = date.today()
    
    # 1. Fetch Stats
    # Optimization: One big query for all ledgers + entries
    ledgers = db.query(Ledger).options(selectinload(Ledger.entries)).all()
    
    # Map Ledger ID -> Stats
    ledger_stats = {} 
    
    for l in ledgers:
        # Filter Logic
        relevant = []
        if l.entries:
            relevant = [
                e for e in l.entries 
                if (not from_date or e.voucher.date >= from_date) and (e.voucher.date <= to_date)
            ]
            
        dr = sum(e.amount for e in relevant if e.is_debit)
        cr = sum(e.amount for e in relevant if not e.is_debit)
        
        # Opening
        # If from_date is set, Opening is (Actual Opening + Transactions < From)
        # MVP: Ignore complex opening calc if from_date is set (Show 0 opening for P&L, calculated for BS).
        # Tally logic:
        # Opening = Balance as of 'from_date - 1'.
        op_bal = l.opening_balance
        if from_date:
            # We must calculate movement before from_date
            prev_entries = [e for e in l.entries if e.voucher.date < from_date]
            p_dr = sum(e.amount for e in prev_entries if e.is_debit)
            p_cr = sum(e.amount for e in prev_entries if not e.is_debit)
            op_bal += (p_dr - p_cr)
            
        cl_bal = op_bal + (dr - cr)
        
        ledger_stats[l.id] = {
            "opening": op_bal,
            "debit": dr,
            "credit": cr,
            "closing": cl_bal
        }
        
    # 2. Build Hierarchy
    groups = db.query(AccountGroup).options(selectinload(AccountGroup.children), selectinload(AccountGroup.ledgers)).all()
    roots = [g for g in groups if g.parent_id is None]
    
    def build_tree(g):
        children_items = []
        
        # Sub Groups
        for child in g.children:
            children_items.append(build_tree(child))
            
        # Ledgers (Direct children)
        for l in g.ledgers:
            stats = ledger_stats.get(l.id, {"opening":0,"debit":0,"credit":0,"closing":0})
            children_items.append(TrialBalanceItem(
                id=l.id,
                name=l.name,
                type="ledger",
                opening_balance=stats["opening"],
                debit_amount=stats["debit"],
                credit_amount=stats["credit"],
                closing_balance=stats["closing"],
                children=[]
            ))
            
        # Aggregate logic for THIS Group
        # In Trial Balance, Group Totals are SUM of children
        op = sum(c.opening_balance for c in children_items)
        dr = sum(c.debit_amount for c in children_items)
        cr = sum(c.credit_amount for c in children_items)
        cl = sum(c.closing_balance for c in children_items)
        
        return TrialBalanceItem(
            id=g.id,
            name=g.name,
            type="group",
            opening_balance=op,
            debit_amount=dr,
            credit_amount=cr,
            closing_balance=cl,
            children=children_items
        )
        
    items = [build_tree(r) for r in roots]
    
    # Filter out empty roots? Tally keeps them usually if option set (Show Empty).
    # Let's keep them for structural clarity.
    
    total_dr = sum(i.debit_amount for i in items)
    total_cr = sum(i.credit_amount for i in items)
    
    return TrialBalanceResponse(
        items=items,
        total_debit=total_dr,
        total_credit=total_cr,
        diff=total_dr - total_cr
    )


from app.modules.analytics.schemas import DashboardData, DashboardAlert

@router.get("/dashboard", response_model=DashboardData)
def get_dashboard_data(db: Session = Depends(get_db)):
    # 1. Financial Overview
    # Cash / Bank
    # We can use get_group_summary logic effectively?
    # Or reuse get_ledger_balances directly.
    
    # Let's get generic ledger balances
    ledgers = db.query(Ledger).all()
    # Simple balance map
    balances = {}
    for l in ledgers:
        # DB Query for balance? Or use cache?
        # Naive approach for Dashboard:
        # Sum of all entries.
        # This is heavy if no cache. But fine for MVP.
        # Using SQLAlchemy func.sum is faster.
        res = db.query(func.sum(VoucherEntry.amount), VoucherEntry.is_debit).filter(VoucherEntry.ledger_id == l.id).group_by(VoucherEntry.is_debit).all()
        dr = sum(r[0] for r in res if r[1])
        cr = sum(r[0] for r in res if not r[1])
        
        op = l.opening_balance
        if not l.opening_balance_is_dr: op = -op
        
        balances[l.id] = op + (dr - cr)

    # Helper to sum group
    all_groups = db.query(AccountGroup).all()
    def get_group_total(name):
        g = next((x for x in all_groups if x.name == name), None)
        if not g: return 0.0
        
        ids = [g.id]
        def add_children(pid):
            kids = [x.id for x in all_groups if x.parent_id == pid]
            ids.extend(kids)
            for k in kids: add_children(k)
        add_children(g.id)
        
        total = 0.0
        relevant_ledgers = [l for l in ledgers if l.group_id in ids]
        for l in relevant_ledgers:
            total += balances.get(l.id, 0)
        return total

    cash = get_group_total("Cash-in-Hand")
    bank = get_group_total("Bank Accounts")
    receivables = get_group_total("Sundry Debtors")
    payables = abs(get_group_total("Sundry Creditors")) # Usually Credit
    
    # Profit
    # Reuse PL logic partially?
    pl = get_profit_loss(db=db)
    # Gross Profit from PL response
    # Our PL response separates incomes/expenses.
    # Gross Profit = (Sales + Direct Inc + Closing Stock) - (Opening Stock + Purchase + Direct Exp)
    # We computed net_profit in schema.
    # Let's approx Gross Profit from PL components.
    
    sales_ac = next((x.amount for x in pl["incomes"] if x.name == "Sales Accounts"), 0)
    direct_inc = next((x.amount for x in pl["incomes"] if x.name == "Direct Incomes"), 0)
    purchase = next((x.amount for x in pl["expenses"] if x.name == "Purchase Accounts"), 0)
    direct_exp = next((x.amount for x in pl["expenses"] if x.name == "Direct Expenses"), 0)
    
    gross_income = sales_ac + direct_inc + pl["closing_stock"]
    gross_expense = pl["opening_stock"] + purchase + direct_exp
    gross_profit = gross_income - gross_expense
    
    margin = (gross_profit / sales_ac * 100) if sales_ac else 0
    
    # GST (Duties & Taxes)
    # We need split of Input (Dr) vs Output (Cr) usually?
    # Or just Net.
    # Frontend asks for "Output GST", "Input Credit".
    # This requires specific ledgers to be tagged or named.
    # Heuristic: 
    # Duties & Taxes group ledgers.
    # Positive (Dr) -> Input Credit
    # Negative (Cr) -> Output Liability
    
    gst_group = next((g for g in all_groups if g.name == "Duties & Taxes"), None)
    gst_payable = 0.0
    gst_credit = 0.0
    
    if gst_group:
         ids = [gst_group.id]
         # Add children
         def add_children(pid):
            kids = [x.id for x in all_groups if x.parent_id == pid]
            ids.extend(kids)
            for k in kids: add_children(k)
         add_children(gst_group.id)
         
         gst_ledgers = [l for l in ledgers if l.group_id in ids]
         for l in gst_ledgers:
             bal = balances.get(l.id, 0)
             if bal > 0: # Dr
                gst_credit += bal
             else:
                gst_payable += abs(bal)

    # 2. Recent Vouchers
    # Get last 5
    recent_vs = db.query(Voucher).order_by(Voucher.date.desc(), Voucher.id.desc()).limit(5).all()
    recent_data = []
    for v in recent_vs:
        # Determine Party & Amount
        # Tally logic: "Party" is the other side of Cash/Bank/Sales?
        # Simple heuristic: First ledger that is NOT the primary classification?
        # Let's just pick the first entry's ledger name for now or "Multiple"
        if v.entries:
             party = v.entries[0].ledger.name
             amt = sum(e.amount for e in v.entries if e.is_debit) # Total Debits = Total Credits
        else:
             party = "N/A"
             amt = 0
             
        # Type slug
        v_type_slug = v.voucher_type.name.lower().split()[0] # e.g. "payment", "receipt"
        if v_type_slug not in ["payment", "receipt", "sales", "purchase", "journal"]:
             v_type_slug = "journal" # fallback

        recent_data.append({
            "id": str(v.id),
            "voucherNo": v.voucher_number,
            "type": v_type_slug,
            "party": party,
            "amount": amt,
            "date": str(v.date),
            "narration": v.narration
        })

    # 3. Alerts (Mock/Real)
    alerts = []
    # Real Alert: Negative Stock
    neg_stock = []
    # We need stock summary?
    # Reuse stock summary logic? Too expense?
    # Simple check on cached vals if possible.
    # For now, let's skip heavy stock check on Dashboard load.
    
    return DashboardData(
        cash_balance=cash,
        bank_balance=bank,
        receivables=receivables,
        payables=payables,
        gross_profit=gross_profit,
        gross_profit_margin=margin,
        gst_payable=gst_payable,
        gst_credit=gst_credit,
        alerts=alerts,
        recent_vouchers=recent_data
    )
