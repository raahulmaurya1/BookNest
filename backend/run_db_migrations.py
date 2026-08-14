from app.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    # 1. Modify books.rating to FLOAT
    conn.execute(sa.text("ALTER TABLE books MODIFY COLUMN rating FLOAT NULL"))
    print("books.rating -> FLOAT  OK")

    # 2. Drop the FK that uses the book_id unique index
    conn.execute(sa.text("ALTER TABLE lending DROP FOREIGN KEY lending_ibfk_1"))
    print("Dropped FK lending_ibfk_1  OK")

    # 3. Drop the unique index on book_id
    conn.execute(sa.text("ALTER TABLE lending DROP INDEX book_id"))
    print("Dropped UNIQUE INDEX book_id  OK")

    # 4. Re-create a non-unique index + FK so referential integrity is preserved
    conn.execute(sa.text("ALTER TABLE lending ADD INDEX idx_lending_book_id (book_id)"))
    conn.execute(sa.text(
        "ALTER TABLE lending ADD CONSTRAINT lending_ibfk_1 "
        "FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL"
    ))
    print("Re-added non-unique index + FK  OK")

    conn.commit()
    print("All DB migrations committed.")
