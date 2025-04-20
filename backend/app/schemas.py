# backend/app/schemas.py
from pydantic import BaseModel, HttpUrl, Field, EmailStr
from datetime import datetime
from typing import List, Optional
from .models import LinkStatus # Re-add LinkStatus import

# --- Request Schemas ---

class URLCreateRequest(BaseModel):
    url: HttpUrl

# Re-add Schema for updating the status of a link
class URLStatusUpdateRequest(BaseModel):
    status: LinkStatus # The desired new status (Active or Inactive)

class UserCreate(BaseModel):
    email: EmailStr
    password: str

# --- Response Schemas ---

class URLMappingBase(BaseModel):
    original_url: HttpUrl
    short_code: Optional[str] = None

# Re-add status field to response schemas
class URLMappingInfo(URLMappingBase):
    id: int
    visit_count: int
    status: LinkStatus # Re-add status field
    created_at: datetime
    short_url: str

    class Config:
        from_attributes = True

class URLShortenResponse(URLMappingInfo):
    pass

class URLListResponse(BaseModel):
    links: List[URLMappingInfo]

class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True