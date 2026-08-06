# Third-party Libraries
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

# Local Project Imports
from app.database import SessionLocal
from app.auth.jwt import decode_access_token
from app.models.user import User

# Tells FastAPI that the token is expected at the /auth/login endpoint.
# This powers the "Authorize" button in the Swagger UI.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_error

    except JWTError:
        raise credentials_error

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise credentials_error

    return user
