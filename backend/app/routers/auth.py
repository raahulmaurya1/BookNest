# Third-party Libraries
from fastapi import APIRouter, Depends, Response, Request, HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.dependencies import get_db, get_current_user
from app.schemas.user import UserRegisterRequest, UserResponse
from app.schemas.auth import UserLoginRequest, TokenResponse
from app.services import auth_service
from app.models.user import User
from app.auth.jwt import decode_refresh_token, create_access_token
from jose import JWTError
import os

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(request: UserRegisterRequest, db: Session = Depends(get_db)):
    return auth_service.register_user(request, db)


@router.post("/login", response_model=TokenResponse)
def login(request: UserLoginRequest, response: Response, db: Session = Depends(get_db)):
    auth_data = auth_service.login_user(request, db)
    
    # Set the refresh token as an HttpOnly cookie
    refresh_token = auth_data.pop("refresh_token")
    
    # In production, secure=True ensures it's only sent over HTTPS. 
    # For local development (HTTP), it should be False or omitted if your framework requires HTTPS for secure=True.
    # A simple heuristic: if running on localhost, use False.
    is_secure = os.getenv("ENVIRONMENT", "development") == "production"
    
    # Max age from config (e.g., 7 days)
    from app.config import JWT_REFRESH_EXPIRE_DAYS
    max_age_seconds = JWT_REFRESH_EXPIRE_DAYS * 24 * 60 * 60
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=max_age_seconds,
        path="/",
    )
    
    return auth_data


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
        
    try:
        payload = decode_refresh_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
        
    access_token = create_access_token(user_id=user.id)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        samesite="lax",
    )
    return None


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
