# Third-party Libraries
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

# Local Project Imports
from app.models.user import User
from app.schemas.user import UserRegisterRequest
from app.schemas.auth import UserLoginRequest
from app.auth.password import hash_password, verify_password
from app.auth.jwt import create_access_token


def register_user(request: UserRegisterRequest, db: Session) -> User:
    # Normalize email: lowercase and strip whitespace before any DB operations.
    normalized_email = request.email.strip().lower()

    # Check if a user with this email already exists.
    existing_user = db.query(User).filter(User.email == normalized_email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    hashed = hash_password(request.password)

    new_user = User(
        name=request.name,
        email=normalized_email,
        password_hash=hashed,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def login_user(request: UserLoginRequest, db: Session) -> dict:
    normalized_email = request.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Use a generic error message to avoid revealing whether the email exists.
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    access_token = create_access_token(user_id=user.id)

    return {"access_token": access_token, "token_type": "bearer"}
