from sqlalchemy import Boolean, Column, Integer, String, Enum
import enum
from  app.db.base import Base

class UserRole(str, enum.Enum):
    OWNER = "owner"
    ACCOUNTANT = "accountant"

class User(Base):
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default=UserRole.ACCOUNTANT)
    is_active = Column(Boolean, default=True)
