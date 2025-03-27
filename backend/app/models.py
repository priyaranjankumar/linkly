# backend/app/models.py
from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLAlchemyEnum # Ensure Integer is imported
from sqlalchemy.sql import func
from .database import Base
import enum

# Define possible statuses using Python Enum
class LinkStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"

# SQLAlchemy model for the URL mapping table
class URLMapping(Base):
    __tablename__ = "url_mappings"

    # Use Integer for ID - better compatibility with SQLite autoincrement in tests
    id = Column(Integer, primary_key=True, index=True)
    # Short code is generated after initial insertion based on ID
    short_code = Column(String, unique=True, index=True, nullable=True)
    original_url = Column(String, index=True, nullable=False)
    visit_count = Column(Integer, default=0, nullable=False)
    status = Column(SQLAlchemyEnum(LinkStatus), default=LinkStatus.ACTIVE, nullable=False)
    # Automatically set creation timestamp on the database side
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Optional: Automatically update timestamp on modification
    # updated_at = Column(DateTime(timezone=True), onupdate=func.now())