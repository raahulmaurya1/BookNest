# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.book import Book
from app.models.user import User
from app.schemas.book import BookCreateRequest, BookUpdateRequest


def create_book(request: BookCreateRequest, current_user: User, db: Session) -> Book:
    new_book = Book(
        owner_id=current_user.id,
        title=request.title,
        author=request.author,
        status=request.status,
        total_pages=request.total_pages,
        notes=request.notes,
    )

    db.add(new_book)
    db.commit()
    db.refresh(new_book)

    return new_book


def get_all_books(current_user: User, db: Session) -> list[Book]:
    books = db.query(Book).filter(Book.owner_id == current_user.id).all()
    return books


def get_book(book_id: int, current_user: User, db: Session) -> Book:
    book = db.query(Book).filter(Book.id == book_id, Book.owner_id == current_user.id).first()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found.",
        )

    return book


def update_book(book_id: int, request: BookUpdateRequest, current_user: User, db: Session) -> Book:
    book = get_book(book_id, current_user, db)

    # Only update fields that were actually sent in the request.
    update_data = request.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)

    return book


def delete_book(book_id: int, current_user: User, db: Session) -> None:
    book = get_book(book_id, current_user, db)

    db.delete(book)
    db.commit()
