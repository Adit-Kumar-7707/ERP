from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class TaxRate(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False) # e.g. "GST 18%"
    rate_percent = Column(Float, nullable=False) # 18.0
    
    # Split
    cgst_percent = Column(Float, default=0.0) # 9.0
    sgst_percent = Column(Float, default=0.0) # 9.0
    igst_percent = Column(Float, default=0.0) # 18.0

class HSNCode(Base):
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False) # e.g. "8517"
    description = Column(String, nullable=True)

class ItemTaxConfig(Base):
    """
    Link Item to Tax Rate and HSN.
    Ideally One-to-One with StockItem, or history?
    For now, One-to-One via ForeignKey in Item OR separate table.
    Checklist says "ItemTaxConfig: stock_item_id...".
    This allows an item to have a tax config.
    """
    id = Column(Integer, primary_key=True, index=True)
    stock_item_id = Column(Integer, ForeignKey('stockitem.id'), unique=True, nullable=False)
    tax_rate_id = Column(Integer, ForeignKey('taxrate.id'), nullable=False)
    hsn_code_id = Column(Integer, ForeignKey('hsncode.id'), nullable=True)
    
    # Relations
    # We need to import StockItem from inventory, but avoid circular import if possible.
    # Use string reference.
    tax_rate = relationship("TaxRate")
    hsn_code = relationship("HSNCode")
    # item = relationship("app.modules.inventory.models.StockItem") # Circular?
