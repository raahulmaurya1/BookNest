# Third-party Libraries
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.user import UserRegisterRequest, UserResponse
from app.schemas.auth import UserLoginRequest, TokenResponse
from app.services import auth_service
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(request, db)


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    return auth_service.login_user(request, db)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
