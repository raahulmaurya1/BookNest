# Standard Library
from datetime import datetime

# Third-party Libraries
from sqlalchemy import Column, Integer, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship

# Local Project Imports
from app.database import Base


class Lending(Base):
    __tablename__ = "lending"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lent_date = Column(TIMESTAMP, default=datetime.utcnow)
    returned_date = Column(TIMESTAMP, nullable=True)

    # Relationships
    book = relationship("Book", backref="lendings")
    owner = relationship("User", foreign_keys=[owner_id], backref="books_lent")
    borrower = relationship("User", foreign_keys=[borrower_id], backref="books_borrowed")

    @property
    def owner_name(self) -> str:
        return self.owner.name if self.owner else None

    @property
    def borrower_name(self) -> str:
        return self.borrower.name if self.borrower else None
