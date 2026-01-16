from pydantic import BaseModel
from typing import List, Dict, Any

class DashboardMetrics(BaseModel):
    revenue: float
    expenses: float
    net_profit: float
    cash_balance: float
    bank_balance: float # Added
    cash_in_hand: float # Added
    receivables: float
    payables: float
    monthly_revenue: float # Added
    monthly_expenses: float # Added
    monthly_profit: float # Added
    gst_payable: float # Added
    gst_credit: float # Added

class TrendPoint(BaseModel):
    period: str # YYYY-MM
    revenue: float
    expenses: float
    profit: float

class DashboardResponse(BaseModel):
    metrics: DashboardMetrics
    trends: List[TrendPoint]
    recent_activity: List[Dict[str, Any]]
    voucher_stats: Dict[str, Dict[str, Any]] # {"payment": {"count": 10, "amount": 5000}}
