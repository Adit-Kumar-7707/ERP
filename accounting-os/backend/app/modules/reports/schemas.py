from pydantic import BaseModel
from typing import List, Optional

class ReportLine(BaseModel):
    account_id: Optional[int]
    name: str # Account Name or Header
    amount: float
    level: int # Indentation level
    is_header: bool = False
    is_total: bool = False
    children: List['ReportLine'] = []

class PnLResponse(BaseModel):
    income: List[ReportLine]
    expenses: List[ReportLine]
    total_income: float
    total_expense: float
    net_profit: float
