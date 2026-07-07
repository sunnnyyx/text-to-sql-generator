import os
from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from schema_service import get_schema
from sql_generator import generate_sql
from pydantic import BaseModel
from sql_generator import generate_sql, SQLGenerationError
from fastapi import HTTPException

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Text-to-SQL backend is running"}

@app.get("/db-check")
def db_check():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        return {"database_connected": True, "result": result.scalar()}
    
@app.get("/schema")
def schema():
    return get_schema(engine)


class QuestionRequest(BaseModel):
    question: str


@app.post("/generate-sql")
def generate_sql_endpoint(request: QuestionRequest):
    try:
        return generate_sql(engine, request.question)
    except SQLGenerationError as e:
        raise HTTPException(status_code=422, detail=str(e))