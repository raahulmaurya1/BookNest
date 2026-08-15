# Standard Library
from datetime import date

# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.book import Book, BookStatus
from app.models.shelf import shelf_books
from app.models.shelf_member import ShelfMember
from app.models.lending import Lending
from app.models.user import User
from app.schemas.book import BookCreateRequest, BookUpdateRequest, ReadingProgressRequest
from app.services import activity_service, storage_service


def _check_book_access(book_id: int, current_user: User, db: Session) -> Book:
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found.",
        )

    # 1. Owner has full access
    if book.owner_id == current_user.id:
        return book

    # 2. Check if user is a member of a shelf containing this book
    shared_shelf_access = (
        db.query(ShelfMember)
        .join(shelf_books, shelf_books.c.shelf_id == ShelfMember.shelf_id)
        .filter(shelf_books.c.book_id == book_id, ShelfMember.user_id == current_user.id)
        .first()
    )
    if shared_shelf_access:
        return book

    # 3. Check if user is an active borrower of this book
    active_borrower = (
        db.query(Lending)
        .filter(
            Lending.book_id == book_id,
            Lending.borrower_id == current_user.id,
            Lending.returned_date.is_(None),
        )
        .first()
    )
    if active_borrower:
        return book

    # Unauthorized access attempt
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Book not found.",
    )


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
    activity_service.log_activity(current_user.id, "added_book", db, reference_id=None)
    db.commit()
    db.refresh(new_book)

    return new_book


def get_all_books(current_user: User, db: Session) -> list[Book]:
    books = db.query(Book).filter(Book.owner_id == current_user.id).all()
    for book in books:
        if book.pdf_path:
            book.pdf_url = storage_service.get_signed_pdf_url(book.pdf_path)
    return books


def get_owned_book(book_id: int, current_user: User, db: Session) -> Book:
    # Used for mutations (update, delete) which must remain strictly owner-only
    book = db.query(Book).filter(Book.id == book_id, Book.owner_id == current_user.id).first()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found or you do not have permission to modify it.",
        )
    
    return book

def get_book(book_id: int, current_user: User, db: Session) -> Book:
    # Used for viewing, allows owners, borrowers, and collaborators
    book = _check_book_access(book_id, current_user, db)

    if book.pdf_path:
        book.pdf_url = storage_service.get_signed_pdf_url(book.pdf_path)

    return book


def update_book(book_id: int, request: BookUpdateRequest, current_user: User, db: Session) -> Book:
    book = get_owned_book(book_id, current_user, db)

    # Only update fields that were actually sent in the request.
    update_data = request.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(book, field, value)

    db.commit()
    db.refresh(book)

    if book.pdf_path:
        book.pdf_url = storage_service.get_signed_pdf_url(book.pdf_path)

    return book


def delete_book(book_id: int, current_user: User, db: Session) -> None:
    book = get_owned_book(book_id, current_user, db)

    # Check for active lending records
    active_loan = db.query(Lending).filter(
        Lending.book_id == book_id,
        Lending.returned_date.is_(None)
    ).first()

    if active_loan:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This book is currently lent out and cannot be deleted until it is returned.",
        )

    if book.pdf_path:
        storage_service.delete_pdf(book.pdf_path)

    # Clean up associated lending records (historical) to prevent orphaned 404s
    db.query(Lending).filter(Lending.book_id == book_id).delete(synchronize_session=False)

    activity_service.log_activity(current_user.id, "deleted_book", db, reference_id=book_id)
    db.delete(book)
    db.commit()


def upload_book_pdf(book_id: int, file_bytes: bytes, filename: str, current_user: User, db: Session) -> Book:
    book = get_owned_book(book_id, current_user, db)

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed.",
        )

    # Delete existing PDF if present
    if book.pdf_path:
        storage_service.delete_pdf(book.pdf_path)

    pdf_path = storage_service.upload_pdf(file_bytes, filename, book_id=book.id, owner_id=current_user.id)
    book.pdf_path = pdf_path

    db.commit()
    db.refresh(book)

    book.pdf_url = storage_service.get_signed_pdf_url(book.pdf_path)
    return book


def get_book_pdf_url(book_id: int, current_user: User, db: Session) -> dict:
    book = _check_book_access(book_id, current_user, db)

    if not book.pdf_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PDF uploaded for this book.",
        )

    signed_url = storage_service.get_signed_pdf_url(book.pdf_path)
    return {"pdf_path": book.pdf_path, "pdf_url": signed_url}


def update_reading_progress(book_id: int, request: ReadingProgressRequest, current_user: User, db: Session) -> Book:
    book = get_book(book_id, current_user, db)

    if request.current_page < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_page cannot be negative.",
        )

    if book.total_pages is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot track progress for a book without total_pages set.",
        )

    if request.current_page > book.total_pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="current_page cannot exceed total_pages.",
        )

    book.current_page = request.current_page

    if book.current_page == book.total_pages:
        book.status = BookStatus.finished
        book.finished_date = date.today()
        activity_service.log_activity(current_user.id, "finished_book", db, reference_id=book_id)
    else:
        if book.current_page > 0 and book.status == BookStatus.want_to_read:
            book.status = BookStatus.reading
        activity_service.log_activity(current_user.id, "updated_progress", db, reference_id=book_id)

    db.commit()
    db.refresh(book)

    if book.pdf_path:
        book.pdf_url = storage_service.get_signed_pdf_url(book.pdf_path)

    return book

