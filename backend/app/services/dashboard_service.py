# Standard Library
from datetime import datetime

# Third-party Libraries
from sqlalchemy import func
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.book import Book, BookStatus
from app.models.shelf import Shelf
from app.models.lending import Lending
from app.models.shelf_member import ShelfMember
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services import activity_service


def get_dashboard_stats(current_user: User, db: Session) -> DashboardResponse:
    user_id = current_user.id

    # 1. Basic Book Counts
    total_books = db.query(Book).filter(Book.owner_id == user_id).count()
    
    want_to_read = db.query(Book).filter(
        Book.owner_id == user_id, Book.status == BookStatus.want_to_read
    ).count()
    
    reading = db.query(Book).filter(
        Book.owner_id == user_id, Book.status == BookStatus.reading
    ).count()
    
    finished = db.query(Book).filter(
        Book.owner_id == user_id, Book.status == BookStatus.finished
    ).count()

    # 2. Finished This Year
    current_year = datetime.utcnow().year
    finished_this_year = db.query(Book).filter(
        Book.owner_id == user_id,
        Book.status == BookStatus.finished,
        func.extract('year', Book.finished_date) == current_year
    ).count()

    # 3. Average Rating
    avg_rating = db.query(func.avg(Book.rating)).filter(
        Book.owner_id == user_id, Book.rating.isnot(None)
    ).scalar()
    
    average_rating = round(float(avg_rating), 1) if avg_rating else 0.0

    # 4. Largest Shelf
    # Gets the user's shelves and orders them by the number of books attached (via shelf_books)
    try:
        from app.models.shelf import shelf_books
        largest_shelf_row = (
            db.query(Shelf.name, func.count(shelf_books.c.book_id).label('book_count'))
            .outerjoin(shelf_books, Shelf.id == shelf_books.c.shelf_id)
            .filter(Shelf.owner_id == user_id)
            .group_by(Shelf.id)
            .order_by(func.count(shelf_books.c.book_id).desc())
            .first()
        )
        largest_shelf = largest_shelf_row.name if largest_shelf_row and largest_shelf_row.book_count > 0 else None
    except Exception:
        largest_shelf = None

    # 5. Lent Books Count
    lent_books_count = db.query(Lending).filter(
        Lending.owner_id == user_id,
        Lending.returned_date.is_(None)
    ).count()

    # 6. Shared Shelves Count
    # Shelves that others have shared with the current user (user is a member, not the owner).
    shared_shelves_count = (
        db.query(ShelfMember.shelf_id)
        .join(Shelf, Shelf.id == ShelfMember.shelf_id)
        .filter(ShelfMember.user_id == user_id, Shelf.owner_id != user_id)
        .distinct()
        .count()
    )

    # 7. Recent Activity — fetch from activity log; map to action strings
    # (DashboardResponse.recent_activity is list[str]; schema is preserved unchanged).
    recent_activity = [
        a.action for a in activity_service.get_user_activity(current_user, db, limit=5)
    ]

    return DashboardResponse(
        total_books=total_books,
        want_to_read_count=want_to_read,
        reading_count=reading,
        finished_count=finished,
        finished_this_year=finished_this_year,
        average_rating=average_rating,
        largest_shelf=largest_shelf,
        lent_books_count=lent_books_count,
        shared_shelves_count=shared_shelves_count,
        recent_activity=recent_activity
    )
