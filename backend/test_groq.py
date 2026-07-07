import os
import json
from dotenv import load_dotenv
from groq import Groq
from sqlalchemy import create_engine
from schema_service import get_schema, format_schema_for_prompt

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
engine = create_engine(os.getenv("DATABASE_URL"))

schema_context = format_schema_for_prompt(get_schema(engine))

system_prompt = f"""You are a PostgreSQL expert. Given a database schema and a
question, generate a single valid PostgreSQL SELECT query that answers it.

Schema:
{schema_context}

Respond with ONLY a JSON object in this exact format, no other text:
{{"sql": "<the SQL query>", "explanation": "<one sentence explaining what it does>"}}
"""

question = "What is the total amount of all orders per customer?"

response = client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ],
)

raw = response.choices[0].message.content
print("RAW RESPONSE:")
print(raw)

parsed = json.loads(raw)
print("\nPARSED:")
print("SQL:", parsed["sql"])
print("Explanation:", parsed["explanation"])