# Standard Library
from datetime import date, datetime
from typing import Optional

# Third-party Libraries
from pydantic import BaseModel

# Local Project Imports
from app.models.book import BookStatus


class BookCreateRequest(BaseModel):
    title: str
    author: str
    status: BookStatus = BookStatus.want_to_read
    total_pages: Optional[int] = None
    notes: Optional[str] = None


class BookUpdateRequest(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    status: Optional[BookStatus] = None
    total_pages: Optional[int] = None
    current_page: Optional[int] = None
    rating: Optional[float] = None
    notes: Optional[str] = None
    finished_date: Optional[date] = None


class ReadingProgressRequest(BaseModel):
    current_page: int


class BookResponse(BaseModel):
    id: int
    owner_id: int
    title: str
    author: str
    status: BookStatus
    total_pages: Optional[int]
    current_page: int
    rating: Optional[float]
    notes: Optional[str]
    finished_date: Optional[date]
    created_at: datetime

    model_config = {"from_attributes": True}
