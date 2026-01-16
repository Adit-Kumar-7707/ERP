from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Enum, Date
from sqlalchemy.orm import relationship, backref
from app.db.base import Base
import enum

class ValuationMethod(str, enum.Enum):
    FIFO = "FIFO"
    WEIGHTED_AVERAGE = "AVG"

class StockGroup(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(Integer, ForeignKey('stockgroup.id'), nullable=True)
    
    # Hierarchy
    children = relationship("StockGroup", 
        backref=backref('parent', remote_side=[id]),
        cascade="all, delete-orphan"
    )

class UnitOfMeasure(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # e.g. Kilograms
    symbol = Column(String, unique=True, nullable=False) # e.g. kg
    precision = Column(Integer, default=2) # e.g. 2 decimal places

class StockItem(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    part_number = Column(String, unique=True, index=True, nullable=True)
    
    group_id = Column(Integer, ForeignKey('stockgroup.id'), nullable=True)
    uom_id = Column(Integer, ForeignKey('unitofmeasure.id'), nullable=True)
    
    # Valuation & Taxation
    valuation_method = Column(String, default=ValuationMethod.WEIGHTED_AVERAGE)
    gst_rate = Column(Float, default=0.0)
    
    # Opening Balance (One-time set)
    opening_quantity = Column(Float, default=0.0)
    opening_value = Column(Float, default=0.0) # Total Value
    
    # Planning
    reorder_level = Column(Float, default=0.0)
    
    # GL Integration
    inventory_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    cogs_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    sales_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    purchase_account_id = Column(Integer, ForeignKey('account.id'), nullable=True)
    
    group = relationship("StockGroup")
    uom = relationship("UnitOfMeasure")
    
    inventory_account = relationship("app.modules.accounting.models.Account", foreign_keys=[inventory_account_id])
    cogs_account = relationship("app.modules.accounting.models.Account", foreign_keys=[cogs_account_id])

class StockLedgerEntry(Base):
    """
    Single source of truth for stock movement and valuation.
    """
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, index=True, nullable=False)
    
    stock_item_id = Column(Integer, ForeignKey('stockitem.id'), nullable=False, index=True)
    voucher_id = Column(Integer, ForeignKey('voucherentry.id'), nullable=True, index=True) # Link to Source
    
    # Movement
    qty_in = Column(Float, default=0.0)
    qty_out = Column(Float, default=0.0)
    
    # Value Capture (At the time of transaction)
    rate = Column(Float, default=0.0) # Transaction Rate
    value = Column(Float, default=0.0) # Transaction Value (qty * rate)
    
    # Valuation Impact (Computed)
    cost_value = Column(Float, default=0.0) # Cost of Goods (for Outwards)
    
    is_opening = Column(Boolean, default=False)
    
    item = relationship("StockItem")
    voucher = relationship("app.modules.vouchers.models.VoucherEntry")
