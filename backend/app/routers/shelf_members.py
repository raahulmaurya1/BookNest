# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.shelf_member import AddMemberRequest, UpdateMemberRoleRequest, MemberResponse
from app.services import shelf_member_service
from app.models.user import User

router = APIRouter(prefix="/shelves/{shelf_id}/members", tags=["Shelf Members"])


@router.post("/", response_model=MemberResponse, status_code=201)
def add_member(
    shelf_id: int,
    request: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_member_service.add_member(shelf_id, request, current_user, db)


@router.get("/", response_model=list[MemberResponse])
def get_members(
    shelf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_member_service.get_members(shelf_id, current_user, db)


@router.patch("/{user_id}", response_model=MemberResponse)
def update_member_role(
    shelf_id: int,
    user_id: int,
    request: UpdateMemberRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_member_service.update_member_role(shelf_id, user_id, request, current_user, db)


@router.delete("/{user_id}", status_code=204)
def remove_member(
    shelf_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shelf_member_service.remove_member(shelf_id, user_id, current_user, db)
