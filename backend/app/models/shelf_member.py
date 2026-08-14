# Standard Library
import enum

# Third-party Libraries
from sqlalchemy import Column, Integer, String, Enum, ForeignKey
from sqlalchemy.orm import relationship

# Local Project Imports
from app.database import Base


class ShelfRole(str, enum.Enum):
    owner = "Owner"
    editor = "Editor"
    viewer = "Viewer"


class ShelfMember(Base):
    __tablename__ = "shelf_members"

    shelf_id = Column(Integer, ForeignKey("shelves.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(
        Enum(ShelfRole, values_callable=lambda obj: [e.value for e in obj]),
        default=ShelfRole.viewer,
        nullable=False,
    )

    # Relationships
    # passive_deletes=True tells SQLAlchemy to rely on the DB's ON DELETE CASCADE
    # rather than trying to nullify shelf_id (which is part of the composite PK).
    shelf = relationship("Shelf", backref="members", passive_deletes=True)
    user = relationship("User", backref="shared_shelves")
