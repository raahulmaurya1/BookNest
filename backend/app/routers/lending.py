# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.lending import LendBookRequest, LendingResponse
from app.services import lending_service
from app.models.user import User


router = APIRouter(prefix="/lending", tags=["Lending"])


@router.post("/{book_id}", response_model=LendingResponse, status_code=201)
def lend_book(
    book_id: int,
    request: LendBookRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lending_service.lend_book(book_id, request, current_user, db)


@router.patch("/{lending_id}/return", response_model=LendingResponse)
def return_book(
    lending_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lending_service.return_book(lending_id, current_user, db)


@router.get("/lent", response_model=list[LendingResponse])
def get_lent_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lending_service.get_lent_books(current_user, db)


@router.get("/borrowed", response_model=list[LendingResponse])
def get_borrowed_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return lending_service.get_borrowed_books(current_user, db)
