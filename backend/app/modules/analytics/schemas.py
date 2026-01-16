from pydantic import BaseModel
from typing import List, Optional, Any

class BalanceSheetItem(BaseModel):
    name: str # Group Name or 'Profit & Loss'
    balance: float # Absolute value
    children: List['BalanceSheetItem'] = []

class BalanceSheetResponse(BaseModel):
    liabilities: List[BalanceSheetItem]
    assets: List[BalanceSheetItem]
    total_liabilities: float
    total_assets: float
    diff: float

class StockSummaryItem(BaseModel):
    name: str
    closing_qty: float
    closing_value: float # At Cost (Simplified)

class StockSummaryResponse(BaseModel):
    items: List[StockSummaryItem]

class PLItem(BaseModel):
    name: str 
    amount: float
    children: List['PLItem'] = []

class PLResponse(BaseModel):
    expenses: List[PLItem] # Purchase, Direct Exp, Indirect Exp
    incomes: List[PLItem]  # Sales, Direct Inc, Indirect Inc
    opening_stock: float
    closing_stock: float
    net_profit: float # Positive = Profit, Negative = Loss
    total_expenses: float
    total_incomes: float

class GroupSummaryItem(BaseModel):
    id: int
    name: str
    type: str # 'group' or 'ledger'
    balance: float # Absolute
    is_debit: bool

class GroupSummaryResponse(BaseModel):
    group_name: str
    items: List[GroupSummaryItem]
    total_debit: float
    total_credit: float
    
class RatioAnalysisResponse(BaseModel):
    working_capital: float
    current_ratio: float
    quick_ratio: float
    debt_equity_ratio: float
    gross_profit_percent: float
    net_profit_percent: float
    return_on_working_capital: float
    
class MonthlyFlow(BaseModel):
    month: str
    inflow: float
    outflow: float
    net: float

class CashFlowResponse(BaseModel):
    items: List[MonthlyFlow]
    total_inflow: float
    total_outflow: float
    net_flow: float

class TrialBalanceItem(BaseModel):
    id: int
    name: str # Group or Ledger Name
    type: str # 'group' or 'ledger'
    opening_balance: float
    debit_amount: float
    credit_amount: float
    closing_balance: float
    children: List['TrialBalanceItem'] = []

class TrialBalanceResponse(BaseModel):
    items: List[TrialBalanceItem]
    total_debit: float
    total_credit: float
    diff: float

class DashboardAlert(BaseModel):
    id: str
    type: str
    title: str
    description: str
    action_label: Optional[str] = None
    action_href: Optional[str] = None
    timestamp: str

class DashboardData(BaseModel):
    cash_balance: float
    bank_balance: float
    receivables: float
    payables: float
    gross_profit: float
    gross_profit_margin: float
    gst_payable: float
    gst_credit: float
    alerts: List[DashboardAlert]
    recent_vouchers: List[Any]
