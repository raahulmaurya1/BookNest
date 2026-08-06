# Third-party Libraries
from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}
