# Third-party Libraries
from fastapi import FastAPI

# Local Project Imports
from app.routers import auth, books, shelves, shelf_members, lending, dashboard

app = FastAPI(title="BookNest API")

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(shelves.router)
app.include_router(shelf_members.router)
app.include_router(lending.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": "BookNest API is running"}
