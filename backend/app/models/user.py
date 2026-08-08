# Standard Library
from datetime import datetime

# Third-party Libraries
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Local Project Imports
from app.database import Base
import app.models.book   # Ensures Book is registered for relationship mapping
import app.models.shelf  # Ensures Shelf is registered for relationship mapping


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    books = relationship("Book", back_populates="owner", foreign_keys="Book.owner_id")
    shelves = relationship("Shelf", back_populates="owner")
