from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship, backref
from app.db.base import Base

class CostCenter(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String, unique=True, nullable=True)
    
    parent_id = Column(Integer, ForeignKey('costcenter.id'), nullable=True)
    
    # Hierarchy
    children = relationship("CostCenter", 
        backref=backref('parent', remote_side=[id]),
        cascade="all, delete-orphan"
    )

class PriceLevel(Base):
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # e.g. "Standard", "Wholesale"
    description = Column(String, nullable=True)
