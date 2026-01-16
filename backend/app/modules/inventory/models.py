from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, Date
from sqlalchemy.orm import relationship, backref
from app.core.db import Base

class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False) # e.g. Numbers
    symbol = Column(String, unique=True, nullable=False) # e.g. Nos
    precision = Column(Integer, default=0) # Decimal places

    # Compound Unit Support
    base_unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    conversion_factor = Column(Float, default=1.0) # 1 Box = 10 Nos -> factor = 10

    base_unit = relationship("Unit", remote_side=[id])

class Godown(Base):
    __tablename__ = "godowns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("godowns.id"), nullable=True)
    
    parent = relationship("Godown", remote_side=[id], backref="children")

class StockGroup(Base):
    __tablename__ = "stock_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    parent_id = Column(Integer, ForeignKey("stock_groups.id"), nullable=True)
    
    parent = relationship("StockGroup", remote_side=[id], backref="children")
    items = relationship("StockItem", back_populates="group")

    # GST Details (Inheritable)
    hsn_code = Column(String, nullable=True)
    gst_rate = Column(Float, default=0.0) 
    taxability = Column(String, default="Taxable")

class StockItem(Base):
    __tablename__ = "stock_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    group_id = Column(Integer, ForeignKey("stock_groups.id"), nullable=True, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    
    # Opening Balance
    opening_qty = Column(Float, default=0.0)
    opening_rate = Column(Float, default=0.0)
    opening_value = Column(Float, default=0.0)
    
    # GST Details
    hsn_code = Column(String, nullable=True)
    gst_rate = Column(Float, default=0.0) # Percentage (e.g. 18.0)
    taxability = Column(String, default="Taxable") # Taxable, Exempt, Nil Rated
    
    group = relationship("StockGroup", back_populates="items")
    unit = relationship("Unit")

    @property
    def effective_gst_rate(self):
        if self.gst_rate and self.gst_rate > 0:
            return self.gst_rate
        
        # Traverse Group Hierarchy
        grp = self.group
        while grp:
            if grp.gst_rate and grp.gst_rate > 0:
                return grp.gst_rate
            grp = grp.parent
            
        return 0.0 # Default fallback
