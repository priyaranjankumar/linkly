# backend/app/models.py
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLAlchemyEnum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum # Re-add enum import

# Re-add LinkStatus enum
class LinkStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    links = relationship("URLMapping", back_populates="owner")

# SQLAlchemy model for the URL mapping table
class URLMapping(Base):
    __tablename__ = "url_mappings"

    id = Column(Integer, primary_key=True, index=True)
    short_code = Column(String, unique=True, index=True, nullable=True)
    original_url = Column(String, index=True, nullable=False)
    visit_count = Column(Integer, default=0, nullable=False)
    # Re-add status column with default
    status = Column(SQLAlchemyEnum(LinkStatus), default=LinkStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="links")
    # Optional: Automatically update timestamp on modification
    # updated_at = Column(DateTime(timezone=True), onupdate=func.now())