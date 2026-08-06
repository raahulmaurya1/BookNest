# Third-party Libraries
from passlib.context import CryptContext

# bcrypt is the industry standard for password hashing.
# It is slow by design, which makes brute-force attacks harder.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
