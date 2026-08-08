# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.shelf import Shelf
from app.models.book import Book
from app.models.user import User
from app.schemas.shelf import ShelfCreateRequest, ShelfUpdateRequest


def create_shelf(request: ShelfCreateRequest, current_user: User, db: Session) -> Shelf:
    new_shelf = Shelf(
        owner_id=current_user.id,
        name=request.name,
    )

    db.add(new_shelf)
    db.commit()
    db.refresh(new_shelf)

    return new_shelf


def get_all_shelves(current_user: User, db: Session) -> list[Shelf]:
    return db.query(Shelf).filter(Shelf.owner_id == current_user.id).all()


def get_shelf(shelf_id: int, current_user: User, db: Session) -> Shelf:
    shelf = db.query(Shelf).filter(
        Shelf.id == shelf_id,
        Shelf.owner_id == current_user.id,
    ).first()

    if not shelf:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shelf not found.",
        )

    return shelf


def update_shelf(shelf_id: int, request: ShelfUpdateRequest, current_user: User, db: Session) -> Shelf:
    shelf = get_shelf(shelf_id, current_user, db)

    shelf.name = request.name

    db.commit()
    db.refresh(shelf)

    return shelf


def delete_shelf(shelf_id: int, current_user: User, db: Session) -> None:
    shelf = get_shelf(shelf_id, current_user, db)

    db.delete(shelf)
    db.commit()


def add_book_to_shelf(shelf_id: int, book_id: int, current_user: User, db: Session) -> Shelf:
    shelf = get_shelf(shelf_id, current_user, db)

    # Verify the user owns the book before adding it to their shelf.
    book = db.query(Book).filter(
        Book.id == book_id,
        Book.owner_id == current_user.id,
    ).first()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found.",
        )

    if book in shelf.books:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is already on this shelf.",
        )

    shelf.books.append(book)
    db.commit()
    db.refresh(shelf)

    return shelf


def remove_book_from_shelf(shelf_id: int, book_id: int, current_user: User, db: Session) -> Shelf:
    shelf = get_shelf(shelf_id, current_user, db)

    book = db.query(Book).filter(
        Book.id == book_id,
        Book.owner_id == current_user.id,
    ).first()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found.",
        )

    if book not in shelf.books:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book is not on this shelf.",
        )

    shelf.books.remove(book)
    db.commit()
    db.refresh(shelf)

    return shelf
