# Third-party Libraries
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Local Project Imports
from app.database import Base

# Junction table for Many-to-Many relationship between shelves and books
shelf_books = Table(
    "shelf_books",
    Base.metadata,
    Column("shelf_id", Integer, ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True),
    Column("book_id", Integer, ForeignKey("books.id", ondelete="CASCADE"), primary_key=True),
)


class Shelf(Base):
    __tablename__ = "shelves"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="shelves")
    books = relationship("Book", secondary=shelf_books, backref="shelves")
