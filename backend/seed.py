import os
import sys

# Add the backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models.user import User
from app.models.book import Book
from app.models.shelf import Shelf
from app.models.shelf_member import ShelfMember
from app.models.lending import Lending
from app.auth.password import hash_password
from datetime import datetime

def seed_db():
    db: Session = SessionLocal()
    try:
        print("Starting database seed...")
        
        # 1. Create Users
        # Check if users already exist
        alice = db.query(User).filter(User.email == "alice@example.com").first()
        if not alice:
            alice = User(name="Alice Smith", email="alice@example.com", password_hash=hash_password("password123"))
            db.add(alice)
            
        bob = db.query(User).filter(User.email == "bob@example.com").first()
        if not bob:
            bob = User(name="Bob Jones", email="bob@example.com", password_hash=hash_password("password123"))
            db.add(bob)
            
        db.commit()
        db.refresh(alice)
        db.refresh(bob)
        print("Users created: Alice (alice@example.com) and Bob (bob@example.com)")

        # 2. Create Books
        # Alice's books
        book1 = db.query(Book).filter(Book.title == "Alice's Adventures in Wonderland").first()
        if not book1:
            book1 = Book(title="Alice's Adventures in Wonderland", author="Lewis Carroll", owner_id=alice.id, current_page=5, total_pages=200)
            db.add(book1)
            
        book2 = db.query(Book).filter(Book.title == "The Great Gatsby").first()
        if not book2:
            book2 = Book(title="The Great Gatsby", author="F. Scott Fitzgerald", owner_id=alice.id, current_page=0, total_pages=150)
            db.add(book2)

        # Bob's book
        book3 = db.query(Book).filter(Book.title == "1984").first()
        if not book3:
            book3 = Book(title="1984", author="George Orwell", owner_id=bob.id, current_page=42, total_pages=328)
            db.add(book3)

        db.commit()
        db.refresh(book1)
        db.refresh(book2)
        db.refresh(book3)
        print("Books created.")

        # 3. Create Shelves
        # Alice's Shared Shelf (Bob is Editor)
        shelf1 = db.query(Shelf).filter(Shelf.name == "Alice's Favorites", Shelf.owner_id == alice.id).first()
        if not shelf1:
            shelf1 = Shelf(name="Alice's Favorites", owner_id=alice.id)
            db.add(shelf1)
            db.commit()
            db.refresh(shelf1)
            
            # Share as Editor
            member1 = ShelfMember(shelf_id=shelf1.id, user_id=bob.id, role="editor")
            db.add(member1)

        # Bob's Shared Shelf (Alice is Viewer)
        shelf2 = db.query(Shelf).filter(Shelf.name == "Bob's Reading List", Shelf.owner_id == bob.id).first()
        if not shelf2:
            shelf2 = Shelf(name="Bob's Reading List", owner_id=bob.id)
            db.add(shelf2)
            db.commit()
            db.refresh(shelf2)
            
            # Share as Viewer
            member2 = ShelfMember(shelf_id=shelf2.id, user_id=alice.id, role="viewer")
            db.add(member2)

        db.commit()
        print("Shelves and collaborations (RBAC) created.")

        # 4. Create an active Lending (Alice lends Gatsby to Bob)
        lending1 = db.query(Lending).filter(Lending.book_id == book2.id, Lending.borrower_id == bob.id, Lending.returned_date.is_(None)).first()
        if not lending1:
            lending1 = Lending(book_id=book2.id, owner_id=alice.id, borrower_id=bob.id, lent_date=datetime.utcnow())
            db.add(lending1)
            db.commit()
            print("Active lending created: Alice lent 'The Great Gatsby' to Bob.")
            
        print("\nSeed complete! You can now log in with:")
        print("1. alice@example.com / password123")
        print("2. bob@example.com / password123")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
