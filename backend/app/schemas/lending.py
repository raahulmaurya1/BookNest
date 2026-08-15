# Standard Library
from datetime import datetime
from typing import Optional

# Third-party Libraries
from pydantic import BaseModel, EmailStr


class LendBookRequest(BaseModel):
    borrower_email: EmailStr


class LendingResponse(BaseModel):
    id: int
    book_id: int
    owner_id: int
    owner_name: Optional[str] = None
    borrower_id: int
    borrower_name: Optional[str] = None
    lent_date: datetime
    returned_date: Optional[datetime]

    model_config = {"from_attributes": True}
