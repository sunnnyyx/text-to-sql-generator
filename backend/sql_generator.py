import os
import json
from dotenv import load_dotenv
from groq import Groq
from sqlalchemy.engine import Engine

from schema_service import get_schema, format_schema_for_prompt
from sql_validator import validate_sql, check_schema_references, SQLValidationError

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT_TEMPLATE = """You are a PostgreSQL expert. Given a database schema and a
question, generate a single valid PostgreSQL SELECT query that answers it.

Schema:
{schema_context}

Respond with ONLY a JSON object in this exact format, no other text:
{{"sql": "<the SQL query>", "explanation": "<one sentence explaining what it does>"}}
"""


class SQLGenerationError(Exception):
    """Raised when the LLM cannot produce valid SQL even after one retry."""
    pass


def _call_llm(system_prompt: str, question: str) -> dict:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ],
    )
    raw = response.choices[0].message.content
    parsed = json.loads(raw)
    return {"sql": parsed["sql"], "explanation": parsed["explanation"]}


def generate_sql(engine: Engine, question: str) -> dict:
    """
    Given a database engine and a natural-language question,
    returns a dict with 'sql' and 'explanation' keys, guaranteed
    to have passed both statement-type and schema-reference validation.

    Raises SQLGenerationError if valid SQL cannot be produced within
    one retry attempt.
    """
    schema = get_schema(engine)
    schema_context = format_schema_for_prompt(schema)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(schema_context=schema_context)

    result = _call_llm(system_prompt, question)

    try:
        validate_sql(result["sql"])
        check_schema_references(result["sql"], schema)
        return result
    except SQLValidationError as first_error:
        # One retry: tell the model exactly what was wrong and ask it to fix it.
        retry_prompt = (
            f"{system_prompt}\n\n"
            f"Your previous SQL was invalid: {first_error}\n"
            f"Previous SQL: {result['sql']}\n"
            f"Please generate a corrected query that fixes this issue."
        )
        retry_result = _call_llm(retry_prompt, question)

        try:
            validate_sql(retry_result["sql"])
            check_schema_references(retry_result["sql"], schema)
            return retry_result
        except SQLValidationError as second_error:
            raise SQLGenerationError(
                f"Could not generate valid SQL after retry. "
                f"First error: {first_error}. Second error: {second_error}."
            )