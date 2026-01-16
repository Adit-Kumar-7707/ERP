import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.db import SessionLocal, engine, Base
from app.modules.accounting.models import Ledger, AccountGroup, Voucher, VoucherEntry, VoucherType
from app.modules.inventory.models import StockItem # Register StockItem
from app.modules.reports.engine import ReportEngine

def test_trial_balance_structure():
    print("--- Testing Report Engine (Trial Balance) ---")
    db = SessionLocal()
    # Reset DB for clean test? Or trust existing data?
    # Let's create specific data for this test.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # 1. Structure:
    # Assets (Primary)
    #   - Current Assets
    #       - Cash In Hand (Ledger: Cash - 500 Dr)
    #       - Bank (Ledger: HDFC - 1000 Dr)
    # Liabilities (Primary)
    #   - Loans (Ledger: Loan A - 1500 Cr)
    
    assets = db.query(AccountGroup).filter(AccountGroup.name == "Report Assets").first()
    if not assets:
        assets = AccountGroup(name="Report Assets", nature="Assets")
        db.add(assets)
        db.flush()
        
    curr_assets = db.query(AccountGroup).filter(AccountGroup.name == "Report Current Assets").first()
    if not curr_assets:
        curr_assets = AccountGroup(name="Report Current Assets", parent_id=assets.id, nature="Assets")
        db.add(curr_assets)
        db.flush()
        
    cash = db.query(Ledger).filter(Ledger.name == "Report Cash").first()
    if not cash:
        cash = Ledger(name="Report Cash", group_id=curr_assets.id, opening_balance=500.0, opening_balance_is_dr=True)
        db.add(cash)
        
    hdfc = db.query(Ledger).filter(Ledger.name == "Report Bank").first()
    if not hdfc:
        hdfc = Ledger(name="Report Bank", group_id=curr_assets.id, opening_balance=1000.0, opening_balance_is_dr=True)
        db.add(hdfc)
        
    liab = db.query(AccountGroup).filter(AccountGroup.name == "Report Liab").first()
    if not liab:
        liab = AccountGroup(name="Report Liab", nature="Liabilities")
        db.add(liab)
        db.flush()
        
    loan = db.query(Ledger).filter(Ledger.name == "Report Loan").first()
    if not loan:
        loan = Ledger(name="Report Loan", group_id=liab.id, opening_balance=1500.0, opening_balance_is_dr=False) # Credit
        db.add(loan)
        
    db.commit()
    
    # 2. Run Engine
    report_engine = ReportEngine(db)
    tree = report_engine.build_trial_balance_tree(date(2025,1,1))
    
    # 3. Verify
    # Find "Report Assets" node
    asset_node = next((n for n in tree if n["name"] == "Report Assets"), None)
    assert asset_node is not None
    
    # Should contain total 1500 (500 + 1000)
    print(f"Asset Node Total: {asset_node['total_balance']}")
    assert asset_node['total_balance'] == 1500.0
    
    # Check hierarchy
    curr_node = asset_node['children'][0]
    assert curr_node['name'] == "Report Current Assets"
    assert curr_node['total_balance'] == 1500.0
    
    # Find "Report Liab"
    liab_node = next((n for n in tree if n["name"] == "Report Liab"), None)
    assert liab_node is not None
    print(f"Liab Node Total: {liab_node['total_balance']}")
    
    # Cr is negative in our engine logic usually?
    # In `get_group_balances`: `if not l.opening_balance_is_dr: open_bal = -open_bal`
    # So Loan (1500 Cr) should be -1500.
    print("Report Engine Validation Passed.")
    
    # 4. Filter Test: Profit & Loss (Income vs Expenses)
    # Add an Income Ledger and Expense Ledger transaction
    # Let's say we sold something.
    # Debit Cash 500, Credit Sales 500.
    
    # Create Sales Group/Ledger
    sales_grp = db.query(AccountGroup).filter(AccountGroup.name == "Report Sales").first()
    if not sales_grp:
        sales_grp = AccountGroup(name="Report Sales", nature="Income")
        db.add(sales_grp)
        db.flush()
    sales_led = db.query(Ledger).filter(Ledger.name == "Report Sales Led").first()
    if not sales_led:
        sales_led = Ledger(name="Report Sales Led", group_id=sales_grp.id)
        db.add(sales_led)
        db.flush()
        
    # Transaction
    vtype = db.query(VoucherType).first()
    if not vtype:
        vtype = VoucherType(name="Sales", nature="Sales")
        db.add(vtype)
        db.flush()
    
    v1 = Voucher(voucher_type_id=vtype.id, date=date(2025,1,1), voucher_number="TEST/01")
    db.add(v1)
    db.flush()
    
    # Dr Cash 500 (Asset Increase)
    # Cr Sales 500 (Income Increase)
    db.add(VoucherEntry(voucher_id=v1.id, ledger_id=cash.id, amount=500, is_debit=True))
    db.add(VoucherEntry(voucher_id=v1.id, ledger_id=sales_led.id, amount=500, is_debit=False))
    
    db.commit()
    
    # Test P&L
    pl = report_engine.get_profit_loss(date(2024,4,1), date(2025,3,31))
    print("P&L Totals:", pl["totals"])
    
    # Income should be 500
    assert pl["totals"]["total_income_ledgers"] == 500.0
    # Expenses should be 0 (We didn't add expenses yet, maybe check earlier data?) 
    # Actually wait, we had "Report Liab" and "Report Assets". No expenses ledger created in setup.
    # So Net Profit = 500.
    
    assert pl["totals"]["net_profit"] == 500.0
    
    # Test Balance Sheet
    bs = report_engine.get_balance_sheet(date(2025,3,31))
    print("BS Totals:", bs["totals"])
    
    # Assets: Cash was 500 (Open) + Bank 1000 (Open) + 500 (Sales Receipt) = 2000.
    # Liab: Loan 1500 (Open).
    # Net Profit: 500.
    # Equation: Assets (2000) = Liab (1500) + Profit (500). Matches!
    
    assert bs["totals"]["grand_total_assets"] == 2000.0
    assert bs["totals"]["grand_total_liabilities"] == 2000.0
    
    print("BS/PL Validation Passed.")
    db.close()

if __name__ == "__main__":
    test_trial_balance_structure()
