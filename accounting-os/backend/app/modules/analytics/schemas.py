from pydantic import BaseModel
from typing import List, Dict, Any

class DashboardMetrics(BaseModel):
    revenue: float
    expenses: float
    net_profit: float
    cash_balance: float
    receivables: float
    payables: float

class TrendPoint(BaseModel):
    period: str # YYYY-MM
    revenue: float
    expenses: float
    profit: float

class DashboardResponse(BaseModel):
    metrics: DashboardMetrics
    trends: List[TrendPoint]
    recent_activity: List[Dict[str, Any]]
