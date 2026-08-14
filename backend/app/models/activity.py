# Standard Library
from datetime import datetime

# Third-party Libraries
from sqlalchemy import Column, Integer, String, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship

# Local Project Imports
from app.database import Base


class Activity(Base):
    __tablename__ = "activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False)
    reference_id = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="activities")
