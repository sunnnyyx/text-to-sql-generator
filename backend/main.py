import os
from dotenv import load_dotenv
from fastapi import FastAPI
from sqlalchemy import create_engine, text
from schema_service import get_schema
from sql_generator import generate_sql
from pydantic import BaseModel
from sql_generator import generate_sql, SQLGenerationError
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, DBAPIError
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

READONLY_DATABASE_URL = os.getenv("READONLY_DATABASE_URL")
readonly_engine = create_engine(
    READONLY_DATABASE_URL,
    connect_args={"options": "-c statement_timeout=25000"},
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://text-to-sql-generator.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def enforce_row_limit(sql: str, max_rows: int = 100) -> str:
    """
    Wraps the given SQL in a subquery with a LIMIT, guaranteeing
    no query can return more than max_rows — regardless of what
    the LLM generated.
    """
    return f"SELECT * FROM ({sql.rstrip(';')}) AS limited_result LIMIT {max_rows}"

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
        result = generate_sql(engine, request.question)
    except SQLGenerationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    limited_sql = enforce_row_limit(result["sql"])

    try:
        with readonly_engine.connect() as conn:
            query_result = conn.execute(text(limited_sql))
            columns = list(query_result.keys())
            rows = [list(row) for row in query_result.fetchall()]
    except OperationalError as e:
        raise HTTPException(
            status_code=504,
            detail="The query took too long to execute and was cancelled.",
        )
    except DBAPIError as e:
        raise HTTPException(
            status_code=500,
            detail="The database encountered an error executing this query.",
        )

    return {
        "sql": result["sql"],
        "explanation": result["explanation"],
        "columns": columns,
        "rows": rows,
        "row_count": len(rows),
    }