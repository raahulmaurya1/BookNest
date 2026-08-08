# Standard Library
from datetime import datetime

# Third-party Libraries
from pydantic import BaseModel, Field

# Local Project Imports
from app.schemas.book import BookResponse


class ShelfCreateRequest(BaseModel):
    name: str


class ShelfUpdateRequest(BaseModel):
    name: str


class ShelfResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    created_at: datetime
    books: list[BookResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}
