# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.book import BookCreateRequest, BookUpdateRequest, BookResponse
from app.services import book_service
from app.models.user import User

router = APIRouter(prefix="/books", tags=["Books"])


@router.post("/", response_model=BookResponse, status_code=201)
def create_book(
    request: BookCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return book_service.create_book(request, current_user, db)


@router.get("/", response_model=list[BookResponse])
def get_all_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return book_service.get_all_books(current_user, db)


@router.get("/{book_id}", response_model=BookResponse)
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return book_service.get_book(book_id, current_user, db)


@router.patch("/{book_id}", response_model=BookResponse)
def update_book(
    book_id: int,
    request: BookUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return book_service.update_book(book_id, request, current_user, db)


@router.delete("/{book_id}", status_code=204)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book_service.delete_book(book_id, current_user, db)
