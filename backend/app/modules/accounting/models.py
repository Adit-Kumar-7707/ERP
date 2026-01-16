from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Enum, Float
from sqlalchemy.orm import relationship
from app.core.db import Base
import enum

class Organization(Base):
    """
    Represents a 'Company' in Tally.
    """
    __tablename__ = "organization"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    
    # Regional Settings
    country = Column(String, default="India")
    state = Column(String) # For GST
    pin_code = Column(String)
    
    # Statutory
    gstin = Column(String, nullable=True)
    gst_registration_date = Column(Date, nullable=True)
    
    # Financial Details
    financial_year_start = Column(Date, nullable=False) # e.g., 2024-04-01
    books_beginning_from = Column(Date, nullable=False) # e.g., 2024-05-01 (Can be later than FY start)
    
    # Currency
    base_currency_symbol = Column(String, default="₹")
    base_currency_formal_name = Column(String, default="INR")
    
    # Features (Tally F11 Features)
    enable_gst = Column(Boolean, default=True)
    enable_inventory = Column(Boolean, default=True)
    enable_cost_centers = Column(Boolean, default=False)

class FinancialYear(Base):
    """
    Represents Tally's 'Current Period'.
    """
    __tablename__ = "financial_years"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organization.id"))
    
    name = Column(String) # e.g. "2024-25"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    is_locked = Column(Boolean, default=False)

# --- Chart of Accounts Models ---

class GroupNature(str, enum.Enum):
    ASSETS = "Assets"
    LIABILITIES = "Liabilities"
    INCOME = "Income"
    EXPENSES = "Expenses"

class AccountGroup(Base):
    """
    Tally 'Groups'.
    Examples: Current Assets, Sundry Debtors, Bank Accounts.
    """
    __tablename__ = "account_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("account_groups.id"), nullable=True, index=True) # Null for Primary Groups
    
    # Nature is usually determined by Primary Parent, but stored for easy Report Generation
    nature = Column(String, nullable=False) # Asset, Liability, Income, Expense
    
    is_reserved = Column(Boolean, default=False) # If True, cannot be deleted (Standard Tally Groups)
    affects_gross_profit = Column(Boolean, default=False) # For Trading vs P&L distinction
    
    # Relationships
    # Adjacency List: 'parent' holds the reference to the parent group.
    # 'children' backref provides the list of subgroups.
    parent = relationship("AccountGroup", remote_side=[id], backref="children")
    ledgers = relationship("Ledger", back_populates="group")

    # GST Details (Inheritable)
    hsn_code = Column(String, nullable=True)
    gst_rate = Column(Float, default=0.0) 
    taxability = Column(String, default="Taxable")

class Ledger(Base):
    """
    Tally 'Ledgers'.
    The actual entities transactions are booked against.
    """
    __tablename__ = "ledgers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    group_id = Column(Integer, ForeignKey("account_groups.id"), nullable=False, index=True)
    
    # Opening Balance
    opening_balance = Column(Float, default=0.0)
    opening_balance_is_dr = Column(Boolean, default=True) # True = Debit, False = Credit
    
    # Mailing Details (For Invoicing)
    mailing_name = Column(String)
    address = Column(String)
    state = Column(String)
    pin_code = Column(String)
    
    # Statutory Details (GST)
    gstin = Column(String)
    registration_type = Column(String, default="Regular") # Regular, Composition, Unregistered, Consumer
    
    # For Duty Ledgers (Duties & Taxes)
    tax_type = Column(String, nullable=True) # GST, Others
    duty_head = Column(String, nullable=True) # CGST, SGST, IGST, Cess
    percentage_of_calculation = Column(Float, default=0.0) # For auto calc if needed
    
    # Relationships
    group = relationship("AccountGroup", back_populates="ledgers")
    entries = relationship("VoucherEntry", back_populates="ledger")

    @property
    def effective_gst_rate(self):
        # Only relevant for Duty ledgers or Sales/Purchase?
        # Usually tax is calculated ON the ledger amount if it's an Item line (but Ledger doesn't have rate usually).
        # Actually, for Service Ledgers (Sales of Services), we need effective rate.
        
        # If this is a Duty ledger, it has percentage_of_calculation? No, that's different.
        
        # Logic:
        # If tax_type is GST, look for percentage.
        # But if this is a Party Ledger, no tax rate.
        # If this is a Sales/Expense Ledger, it might have tax rate.
        
        # If percentage_of_calculation is set, use it? Tally uses "percentage_of_calculation" for Duty ledgers.
        # But for Sales/Purchase ledgers, we check "GST Details".
        
        # Let's use 'percentage_of_calculation' if set, else traverse.
        if self.percentage_of_calculation and self.percentage_of_calculation > 0:
             return self.percentage_of_calculation
             
        # Traverse Group
        grp = self.group
        while grp:
            if grp.gst_rate and grp.gst_rate > 0:
                return grp.gst_rate
            grp = grp.parent
        return 0.0

# --- Voucher Models ---

class VoucherTypeNature(str, enum.Enum):
    CONTRA = "Contra"
    PAYMENT = "Payment"
    RECEIPT = "Receipt"
    JOURNAL = "Journal"
    SALES = "Sales"
    PURCHASE = "Purchase"
    MEMORANDUM = "Memorandum"
    REVERSING_JOURNAL = "Reversing Journal"
    STOCK_JOURNAL = "Stock Journal"

class VoucherType(Base):
    """
    Tally 'Voucher Types'.
    Standard ones: Contra, Payment, Receipt, Journal, Sales, Purchase.
    Users can create custom ones (e.g. 'Bank Payment' under 'Payment').
    """
    __tablename__ = "voucher_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("voucher_types.id"), nullable=True) # Hierarchical types
    nature = Column(String, nullable=False) # Maps to VoucherTypeNature
    
    # Numbering Configuration
    numbering_method = Column(String, default="Automatic") # Automatic, Manual, None
    prevent_duplicates = Column(Boolean, default=True)
    numbering_prefix = Column(String, nullable=True) # e.g. "INV/"
    numbering_suffix = Column(String, nullable=True) # e.g. "/24-25"
    
    # Relationships
    vouchers = relationship("Voucher", back_populates="voucher_type")

class Voucher(Base):
    """
    The Transaction Header.
    """
    __tablename__ = "vouchers"

    id = Column(Integer, primary_key=True, index=True)
    voucher_type_id = Column(Integer, ForeignKey("voucher_types.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    effective_date = Column(Date, nullable=True) # For Aging Analysis (defaults to date)
    voucher_number = Column(String, index=True, nullable=False) # e.g. "1", "INV/24-25/001"
    narration = Column(String)
    
    # Audit
    created_at = Column(Date, nullable=True) # Should be datetime in real impl
    
    # Relationships
    voucher_type = relationship("VoucherType", back_populates="vouchers")
    entries = relationship("VoucherEntry", back_populates="voucher", cascade="all, delete-orphan")

class VoucherEntry(Base):
    """
    Line Items (The actual Debits and Credits).
    """
    __tablename__ = "voucher_entries"

    id = Column(Integer, primary_key=True, index=True)
    voucher_id = Column(Integer, ForeignKey("vouchers.id"), nullable=False, index=True)
    ledger_id = Column(Integer, ForeignKey("ledgers.id"), nullable=False, index=True)
    
    amount = Column(Float, nullable=False) # Absolute Value
    is_debit = Column(Boolean, nullable=False) # True = Dr, False = Cr
    
    # Inventory Fields (Optional)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=True, index=True)
    quantity = Column(Float, default=0.0)
    rate = Column(Float, default=0.0)

    # Banking Details (For BRS)
    bank_date = Column(Date, nullable=True)  # Bank Clearing Date
    instrument_number = Column(String, nullable=True)  # Cheque/DD No
    instrument_date = Column(Date, nullable=True)  # Instrument Date
    
    # Relationships
    voucher = relationship("Voucher", back_populates="entries")
    ledger = relationship("Ledger", back_populates="entries")
    stock_item = relationship("StockItem")
    bill_allocations = relationship("BillAllocation", back_populates="entry", cascade="all, delete-orphan")

class BillAllocation(Base):
    """
    Bill-wise Details (New Ref, Agst Ref, etc.) for Outstanding Management.
    """
    __tablename__ = "bill_allocations"

    id = Column(Integer, primary_key=True, index=True)
    voucher_entry_id = Column(Integer, ForeignKey("voucher_entries.id"), nullable=False, index=True)
    
    ref_type = Column(String, nullable=False) # New Ref, Agst Ref, Advance, On Account
    ref_name = Column(String, nullable=False) # Invoice Number / Bill Name
    amount = Column(Float, nullable=False)
    
    credit_period = Column(Date, nullable=True) # Due Date

    # Relationships
    entry = relationship("VoucherEntry", back_populates="bill_allocations")

