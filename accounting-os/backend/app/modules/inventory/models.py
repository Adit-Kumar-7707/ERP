from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship, backref
from app.db.base import Base

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
    
    # Valuation & Taxation (Config for future)
    gst_rate = Column(Float, default=0.0) 
    
    group = relationship("StockGroup")
    uom = relationship("UnitOfMeasure")
