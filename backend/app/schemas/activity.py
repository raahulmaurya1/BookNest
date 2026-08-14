# Standard Library
from datetime import datetime
from typing import Optional

# Third-party Libraries
from pydantic import BaseModel


class ActivityResponse(BaseModel):
    id: int
    user_id: int
    action: str
    reference_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}
