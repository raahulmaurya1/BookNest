from app.database import engine
import sqlalchemy as sa

with engine.connect() as conn:
    print("=== FK constraints on lending ===")
    result = conn.execute(sa.text(
        "SELECT CONSTRAINT_NAME, COLUMN_NAME "
        "FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE "
        "WHERE TABLE_NAME='lending' AND TABLE_SCHEMA=DATABASE() "
        "AND REFERENCED_TABLE_NAME IS NOT NULL"
    ))
    for row in result:
        print(dict(row._mapping))

    print("=== Indexes on lending ===")
    result2 = conn.execute(sa.text("SHOW INDEX FROM lending"))
    for row in result2:
        print(dict(row._mapping))
