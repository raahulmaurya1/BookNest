from typing import Optional

# Third-party Libraries
from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_books: int
    want_to_read_count: int
    reading_count: int
    finished_count: int
    finished_this_year: int
    average_rating: float
    largest_shelf: Optional[str] = None
    lent_books_count: int
    shared_shelves_count: int
    recent_activity: list[str] = []

    model_config = {"from_attributes": True}
