# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.shelf import ShelfCreateRequest, ShelfUpdateRequest, ShelfResponse
from app.services import shelf_service
from app.models.user import User

router = APIRouter(prefix="/shelves", tags=["Shelves"])


@router.post("/", response_model=ShelfResponse, status_code=201)
def create_shelf(
    request: ShelfCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.create_shelf(request, current_user, db)


@router.get("/", response_model=list[ShelfResponse])
def get_all_shelves(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.get_all_shelves(current_user, db)


@router.get("/{shelf_id}", response_model=ShelfResponse)
def get_shelf(
    shelf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.get_shelf(shelf_id, current_user, db)


@router.patch("/{shelf_id}", response_model=ShelfResponse)
def update_shelf(
    shelf_id: int,
    request: ShelfUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.update_shelf(shelf_id, request, current_user, db)


@router.delete("/{shelf_id}", status_code=204)
def delete_shelf(
    shelf_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shelf_service.delete_shelf(shelf_id, current_user, db)


@router.post("/{shelf_id}/books/{book_id}", response_model=ShelfResponse)
def add_book_to_shelf(
    shelf_id: int,
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.add_book_to_shelf(shelf_id, book_id, current_user, db)


@router.delete("/{shelf_id}/books/{book_id}", response_model=ShelfResponse)
def remove_book_from_shelf(
    shelf_id: int,
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return shelf_service.remove_book_from_shelf(shelf_id, book_id, current_user, db)
