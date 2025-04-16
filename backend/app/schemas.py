# backend/app/schemas.py
from pydantic import BaseModel, HttpUrl, Field, EmailStr
from datetime import datetime
from typing import List, Optional
from .models import LinkStatus # Import the enum

# --- Request Schemas ---

# Schema for validating the incoming URL shortening request body
class URLCreateRequest(BaseModel):
    url: HttpUrl # Pydantic automatically validates if it's a valid HTTP/HTTPS URL

# Schema for updating the status of a link
class URLStatusUpdateRequest(BaseModel):
    status: LinkStatus # The desired new status (Active or Inactive)

class UserCreate(BaseModel):
    email: EmailStr
    password: str

# --- Response Schemas ---

# Base schema for URL mapping data, used for inheritance
class URLMappingBase(BaseModel):
    original_url: HttpUrl
    short_code: Optional[str] = None # Short code might not exist initially

# Schema for the response returned after successfully creating a short URL
class URLShortenResponse(URLMappingBase):
    id: int
    visit_count: int
    status: LinkStatus
    created_at: datetime
    short_url: str # The full clickable short URL (e.g., http://localhost:3000/abc)

    # Pydantic V2 config
    class Config:
        from_attributes = True # Replaces orm_mode=True in Pydantic V2

# Schema used when retrieving details of a single link (can reuse URLShortenResponse)
# This is also used for the status update response
class URLMappingInfo(URLShortenResponse):
    pass

# Schema for the API response returning a list of links for the history table
class URLListResponse(BaseModel):
    links: List[URLMappingInfo]

class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True