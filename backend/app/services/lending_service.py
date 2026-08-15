# Standard Library
from datetime import datetime

# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.book import Book
from app.models.user import User
from app.models.lending import Lending
from app.schemas.lending import LendBookRequest
from app.services import activity_service
from app.services.websocket_service import manager


def lend_book(book_id: int, request: LendBookRequest, current_user: User, db: Session) -> Lending:
    # 1. Verify the book belongs to the current user
    book = db.query(Book).filter(Book.id == book_id, Book.owner_id == current_user.id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or you do not own it.",
        )

    # 2. Find the borrower by email (case-insensitive, whitespace-trimmed)
    normalized_email = request.borrower_email.strip().lower()
    borrower = db.query(User).filter(User.email == normalized_email).first()
    if not borrower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No BookNest account found for this email — the borrower needs to sign up first.",
        )

    # 3. Prevent lending to yourself
    if borrower.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot lend a book to yourself.",
        )

    # 4. Check if the book is already actively lent out
    active_lending = db.query(Lending).filter(
        Lending.book_id == book_id,
        Lending.returned_date.is_(None)
    ).first()

    if active_lending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book is already lent out and has not been returned.",
        )

    # 5. Create lending record
    new_lending = Lending(
        book_id=book_id,
        owner_id=current_user.id,
        borrower_id=borrower.id
    )

    db.add(new_lending)
    activity_service.log_activity(current_user.id, "lent_book", db, reference_id=book_id)
    db.commit()
    db.refresh(new_lending)

    # Notify the borrower in real time (thread-safe — called from sync threadpool).
    manager.notify_user_sync(borrower.id, {
        "event": "book_lent_to_you",
        "book_id": book_id,
        "lending_id": new_lending.id,
    })

    return new_lending


def return_book(book_id: int, current_user: User, db: Session) -> Lending:
    lending = db.query(Lending).filter(
        Lending.book_id == book_id,
        Lending.returned_date.is_(None)
    ).first()

    if not lending:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lending record not found.",
        )

    is_owner = lending.owner_id == current_user.id
    is_borrower = lending.borrower_id == current_user.id

    if not is_owner and not is_borrower:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this loan.",
        )

    if lending.returned_date is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This book has already been marked as returned.",
        )

    lending.returned_date = datetime.utcnow()
    activity_service.log_activity(current_user.id, "returned_book", db, reference_id=lending.book_id)
    db.commit()
    db.refresh(lending)

    # Notify the other party in real time (thread-safe — called from sync threadpool).
    other_party_id = lending.borrower_id if is_owner else lending.owner_id
    manager.notify_user_sync(other_party_id, {
        "event": "book_returned",
        "book_id": lending.book_id,
        "lending_id": lending.id,
    })

    return lending


def get_lent_books(current_user: User, db: Session) -> list[Lending]:
    # Books I have lent to others
    return db.query(Lending).filter(
        Lending.owner_id == current_user.id,
        Lending.returned_date.is_(None)
    ).all()


def get_borrowed_books(current_user: User, db: Session) -> list[Lending]:
    # Books I am borrowing from others
    return db.query(Lending).filter(
        Lending.borrower_id == current_user.id,
        Lending.returned_date.is_(None)
    ).all()
