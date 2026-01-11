from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import date

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

class TrialBalanceLine(BaseModel):
    account_id: int
    account_name: str
    debit: float
    credit: float
    type: str

class TrialBalanceResponse(BaseModel):
    lines: List[TrialBalanceLine]
    total_debit: float
    total_credit: float

class BalanceSheetResponse(BaseModel):
    assets: List[ReportLine]
    liabilities: List[ReportLine]
    equity: List[ReportLine]
    total_assets: float
    total_liabilities: float
    total_equity: float

class LedgerEntry(BaseModel):
    date: date
    voucher_number: str
    particulars: str
    debit: float
    credit: float
    balance: float

class LedgerStatementResponse(BaseModel):
    account_name: str
    opening_balance: float
    entries: List[LedgerEntry]
    closing_balance: float
