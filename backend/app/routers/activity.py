# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.activity import ActivityResponse
from app.services import activity_service
from app.models.user import User


router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("/", response_model=list[ActivityResponse])
def get_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /activity/
    Returns the most recent activity log entries for the current user.
    """
    return activity_service.get_user_activity(current_user, db)
