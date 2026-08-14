# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.shelf import Shelf
from app.models.shelf_member import ShelfMember, ShelfRole
from app.models.user import User
from app.schemas.shelf_member import AddMemberRequest, UpdateMemberRoleRequest
from app.services import activity_service
from app.services.websocket_service import manager


def _get_shelf_or_404(shelf_id: int, db: Session) -> Shelf:
    shelf = db.query(Shelf).filter(Shelf.id == shelf_id).first()

    if not shelf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shelf not found.",
        )

    return shelf


def _require_owner(shelf_id: int, current_user: User, db: Session) -> None:
    # Only the shelf Owner is allowed to manage members.
    membership = db.query(ShelfMember).filter(
        ShelfMember.shelf_id == shelf_id,
        ShelfMember.user_id == current_user.id,
        ShelfMember.role == ShelfRole.owner,
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the shelf Owner can perform this action.",
        )


def add_member(shelf_id: int, request: AddMemberRequest, current_user: User, db: Session) -> ShelfMember:
    _get_shelf_or_404(shelf_id, db)
    _require_owner(shelf_id, current_user, db)

    # Verify the user being added exists.
    user_to_add = db.query(User).filter(User.id == request.user_id).first()

    if not user_to_add:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Prevent adding the same user twice.
    existing = db.query(ShelfMember).filter(
        ShelfMember.shelf_id == shelf_id,
        ShelfMember.user_id == request.user_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already a member of this shelf.",
        )

    new_member = ShelfMember(
        shelf_id=shelf_id,
        user_id=request.user_id,
        role=request.role,
    )

    db.add(new_member)
    activity_service.log_activity(current_user.id, "shelf_shared", db, reference_id=shelf_id)
    db.commit()
    db.refresh(new_member)

    # Notify the invited user in real time via the thread-safe wrapper.
    manager.notify_user_sync(request.user_id, {
        "event": "added_to_shelf",
        "shelf_id": shelf_id,
        "role": request.role.value,
    })

    return new_member


def get_members(shelf_id: int, current_user: User, db: Session) -> list[ShelfMember]:
    _get_shelf_or_404(shelf_id, db)

    # Verify the requesting user is a member of the shelf before showing members.
    membership = db.query(ShelfMember).filter(
        ShelfMember.shelf_id == shelf_id,
        ShelfMember.user_id == current_user.id,
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this shelf.",
        )

    return db.query(ShelfMember).filter(ShelfMember.shelf_id == shelf_id).all()


def update_member_role(
    shelf_id: int,
    user_id: int,
    request: UpdateMemberRoleRequest,
    current_user: User,
    db: Session,
) -> ShelfMember:
    _get_shelf_or_404(shelf_id, db)
    _require_owner(shelf_id, current_user, db)

    member = db.query(ShelfMember).filter(
        ShelfMember.shelf_id == shelf_id,
        ShelfMember.user_id == user_id,
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found on this shelf.",
        )

    # Prevent changing the Owner role - ownership transfer is not supported.
    if member.role == ShelfRole.owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Owner role cannot be changed.",
        )

    member.role = request.role
    activity_service.log_activity(current_user.id, "role_changed", db, reference_id=shelf_id)

    db.commit()
    db.refresh(member)

    return member


def remove_member(shelf_id: int, user_id: int, current_user: User, db: Session) -> None:
    _get_shelf_or_404(shelf_id, db)
    _require_owner(shelf_id, current_user, db)

    member = db.query(ShelfMember).filter(
        ShelfMember.shelf_id == shelf_id,
        ShelfMember.user_id == user_id,
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found on this shelf.",
        )

    # Prevent the Owner from removing themselves.
    if member.role == ShelfRole.owner:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The Owner cannot be removed from the shelf.",
        )

    activity_service.log_activity(current_user.id, "collaborator_removed", db, reference_id=shelf_id)
    db.delete(member)
    db.commit()
