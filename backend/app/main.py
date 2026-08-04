from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.dependencies import get_db

app = FastAPI(title="BookNest API")

@app.get("/")
def root():
    return {"message": "BookNest API is running"}

@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "MySQL connected successfully"}