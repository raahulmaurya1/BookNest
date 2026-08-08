# Third-party Libraries
from fastapi import FastAPI

# Local Project Imports
from app.routers import auth, books, shelves

app = FastAPI(title="BookNest API")

app.include_router(auth.router)
app.include_router(books.router)
app.include_router(shelves.router)


@app.get("/")
def root():
    return {"message": "BookNest API is running"}
