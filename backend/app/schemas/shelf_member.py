# Third-party Libraries
from pydantic import BaseModel, model_validator

# Local Project Imports
from app.models.shelf_member import ShelfRole


class AddMemberRequest(BaseModel):
    user_id: int
    role: ShelfRole = ShelfRole.viewer


class UpdateMemberRoleRequest(BaseModel):
    role: ShelfRole


class MemberResponse(BaseModel):
    user_id: int
    name: str
    email: str
    role: ShelfRole

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_user_fields(cls, data):
        # When data comes from a ShelfMember ORM object,
        # pull name and email from the related user relationship.
        if hasattr(data, "user") and data.user is not None:
            data.__dict__["name"] = data.user.name
            data.__dict__["email"] = data.user.email
        return data

