# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.dashboard import DashboardResponse
from app.services import dashboard_service
from app.models.user import User


router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /dashboard/
    Returns aggregated reading statistics for the current user.
    """
    return dashboard_service.get_dashboard_stats(current_user, db)
