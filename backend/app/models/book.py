# Standard Library
import enum

# Third-party Libraries
from sqlalchemy import Column, Integer, String, Text, Float, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Local Project Imports
from app.database import Base


class BookStatus(str, enum.Enum):
    want_to_read = "Want to Read"
    reading = "Reading"
    finished = "Finished"


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    author = Column(String(255), nullable=False)
    status = Column(
        Enum(BookStatus, values_callable=lambda obj: [e.value for e in obj]),
        default=BookStatus.want_to_read,
        nullable=False,
    )
    total_pages = Column(Integer, nullable=True)
    current_page = Column(Integer, default=0, nullable=False)
    rating = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    pdf_path = Column(String(512), nullable=True)
    finished_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="books", foreign_keys=[owner_id])
