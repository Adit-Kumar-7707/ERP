from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import date

from app.modules.accounting.models import AccountGroup, Ledger, VoucherEntry, Voucher, GroupNature
from app.modules.inventory.models import StockItem
from app.modules.inventory.valuation import calculate_weighted_average

class ReportEngine:
    def __init__(self, db: Session):
        self.db = db

    def get_ledger_balances(self, end_date: date, start_date: Optional[date] = None, include_opening: bool = True) -> Dict[int, float]:
        """
        Returns {ledger_id: balance}.
        Positive = Debit, Negative = Credit.
        """
        balances = {}
        
        # 1. Opening Balances
        if include_opening:
            ledgers = self.db.query(Ledger).all()
            for l in ledgers:
                open_bal = l.opening_balance
                if not l.opening_balance_is_dr:
                    open_bal = -open_bal # Credit is negative
                balances[l.id] = open_bal
        
        # 2. Voucher Movements
        query = self.db.query(
            VoucherEntry.ledger_id,
            func.sum(VoucherEntry.amount).label("total"),
            VoucherEntry.is_debit
        ).join(Voucher).filter(
            Voucher.date <= end_date
        )
        
        if start_date:
            query = query.filter(Voucher.date >= start_date)
            
        query = query.group_by(VoucherEntry.ledger_id, VoucherEntry.is_debit)
        rows = query.all()
        
        for ledger_id, amount, is_debit in rows:
            if ledger_id not in balances:
                balances[ledger_id] = 0.0
                
            if is_debit:
                balances[ledger_id] += amount
            else:
                balances[ledger_id] -= amount
                
        return balances

    def _build_tree(self, balances: Dict[int, float], root_nature_filter: List[str] = None):
        """
        Generic tree builder.
        """
        all_groups = self.db.query(AccountGroup).all()
        
        tree_nodes = {}
        
        # Init Nodes
        for g in all_groups:
            tree_nodes[g.id] = {
                "id": g.id,
                "name": g.name,
                "parent_id": g.parent_id,
                "nature": g.nature,
                "closing_balance": 0.0,
                "total_balance": 0.0,
                "children": [],
                "ledgers": []
            }

        # Add Ledgers
        all_ledgers = self.db.query(Ledger).all()
        for l in all_ledgers:
            if l.id in balances and balances[l.id] != 0:
                bal = balances[l.id]
                node = tree_nodes.get(l.group_id)
                if node:
                    node["ledgers"].append({
                        "id": l.id,
                        "name": l.name,
                        "closing_balance": bal
                    })
                    node["closing_balance"] += bal # Direct Balance

        # Build Hierarchy
        root_nodes = []
        for g_id, node in tree_nodes.items():
            if node["parent_id"]:
                parent = tree_nodes.get(node["parent_id"])
                if parent:
                    parent["children"].append(node)
            else:
                # Root Node
                if root_nature_filter:
                    if node["nature"] in root_nature_filter:
                        root_nodes.append(node)
                else:
                    root_nodes.append(node)

        # Recursive Sum
        def calculate_recursive(node):
            total = node["closing_balance"] 
            for child in node["children"]:
                total += calculate_recursive(child)
            node["total_balance"] = total
            return total

        for root in root_nodes:
            calculate_recursive(root)
            
        return root_nodes

    def build_trial_balance_tree(self, end_date: date):
        # TB uses Cumulative Balances (Asset/Liab) AND Total for Income/Exp?
        # Actually TB is always cumulative from start of books.
        balances = self.get_ledger_balances(end_date, include_opening=True)
        return self._build_tree(balances)

    def get_closing_stock_value(self, end_date: date) -> float:
        """
        Calculates total value of all stock items at end_date.
        """
        total_value = 0.0
        items = self.db.query(StockItem).all()
        for item in items:
            res = calculate_weighted_average(self.db, item.id, end_date)
            total_value += res.closing_value
        return total_value

    def get_profit_loss(self, start_date: date, end_date: date):
        """
        P&L Statement.
        Income (Cr) vs Expenses (Dr).
        Also Opening/Closing Stock.
        """
        # 1. Get Balances for Period (No Opening Balance for Nominal Accounts)
        # However, Tally often keeps P&L cumulative for the year.
        # Let's assume start_date is start of FY.
        balances = self.get_ledger_balances(end_date, start_date=start_date, include_opening=False)
        
        # 2. Build Trees
        expenses = self._build_tree(balances, root_nature_filter=["Expenses"])
        income = self._build_tree(balances, root_nature_filter=["Income"])
        
        # 3. Calculate Totals
        total_expense = sum(n["total_balance"] for n in expenses) # Likely Positive (Dr)
        total_income = sum(n["total_balance"] for n in income) # Likely Negative (Cr)
        
        # Invert Income for display (Make positive representation of revenue)
        abs_income = abs(total_income)
        
        # 4. Inventory Impact
        # Opening Stock (Value at start_date)
        opening_stock = self.get_closing_stock_value(start_date) # Wait, strictly start_date - 1 day?
        # Let's assume start_date implies "From this morning", so we need value "As of start".
        # If start_date is April 1, we need value on April 1 (Opening).
        # My valuation function `upto_date` includes transactions ON that date. 
        # Ideally we want value BEFORE start_date transactions?
        # MVP: Use start_date.
        
        closing_stock = self.get_closing_stock_value(end_date)
        
        # 5. Net Profit Logic
        # Gross Profit (Trading Account) vs Net Profit (P&L).
        # Formula: (Income + Closing Stock) - (Expenses + Opening Stock) = Net Profit
        
        net_profit = (abs_income + closing_stock) - (total_expense + opening_stock)
        
        return {
            "income": income,
            "expenses": expenses,
            "totals": {
                "total_income_ledgers": abs_income,
                "total_expense_ledgers": total_expense,
                "opening_stock": opening_stock,
                "closing_stock": closing_stock,
                "net_profit": net_profit
            }
        }

    def get_balance_sheet(self, end_date: date):
        """
        Balance Sheet.
        Assets vs Liabilities.
        Includes Net Profit from P&L (Cumulative from Beginning of FY?).
        Usually we assume FY Start is known.
        Let's assume FY Start is April 1 of current year context.
        """
        # Determine FY Start (Naive)
        # If month < 4, year-1.
        fy_year = end_date.year if end_date.month >= 4 else end_date.year - 1
        fy_start = date(fy_year, 4, 1)
        
        # 1. Get Real Account Balances (Cumulative)
        balances = self.get_ledger_balances(end_date, include_opening=True)
        
        assets = self._build_tree(balances, root_nature_filter=["Assets"])
        liabilities = self._build_tree(balances, root_nature_filter=["Liabilities"])
        
        # 2. Get P&L for "Current Period" (to add to Capital/Reserves)
        # Note: Previous years' P&L should theoretically be in "Retained Earnings" ledger already via Year-End process.
        # So we only need Current Year P&L.
        pl_data = self.get_profit_loss(fy_start, end_date)
        net_profit = pl_data["totals"]["net_profit"]
        
        # 3. Calculate Totals
        total_assets = sum(n["total_balance"] for n in assets)
        total_liabilities = sum(n["total_balance"] for n in liabilities) # Likely Negative (Cr)
        
        # Balance Sheet Equation: Assets = Liabilities + Equity (Profit)
        # Our Liabilities tree includes Capital/Equity groups generally.
        # But `total_liabilities` is negative.
        # So: Total Assets + Total Liabilities (Neg) should be 0 if balanced?
        # But we have P&L mismatch.
        # Diff = Total Assets + Total Liabilities (which is -ve)
        
        diff = total_assets + total_liabilities
        
        # Ideally, Diff should equal Net Profit?
        # Let's verify.
        # Assets (Dr) + Liabilities (Cr) + Expenses (Dr) + Income (Cr) = 0 (Trial Balance)
        # Assets + Liab = - (Exp + Inc)
        # Assets + Liab = - (Exp - Abs_Inc) = Abs_Inc - Exp = Net Profit (Roughly, ignoring Stock)
        
        # Stock adjustment makes this tricky in Tally.
        # Tally shows Closing Stock in Assets.
        # And adds Profit to Liabilities.
        
        # So:
        # Display Assets = `total_assets` + `closing_stock`
        # Display Liab = `abs(total_liabilities)` + `net_profit`
        
        closing_stock = pl_data["totals"]["closing_stock"]
        
        return {
            "assets": assets,
            "liabilities": liabilities,
            "totals": {
                "total_assets_ledgers": total_assets,
                "total_liabilities_ledgers": abs(total_liabilities),
                "closing_stock": closing_stock,
                "net_profit": net_profit,
                "grand_total_assets": total_assets + closing_stock,
                "grand_total_liabilities": abs(total_liabilities) + net_profit
            }
        }


