# Standard Library
from typing import Optional

# Third-party Libraries
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.activity import Activity
from app.models.user import User


def log_activity(
    user_id: int,
    action: str,
    db: Session,
    reference_id: Optional[int] = None,
) -> None:
    """
    Add an activity record to the current session.
    The calling service is responsible for committing the transaction.
    """
    entry = Activity(
        user_id=user_id,
        action=action,
        reference_id=reference_id,
    )
    db.add(entry)


def get_user_activity(current_user: User, db: Session, limit: int = 20) -> list[Activity]:
    """
    Return the most recent activity entries for the current user,
    ordered by most recent first.
    """
    return (
        db.query(Activity)
        .filter(Activity.user_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
