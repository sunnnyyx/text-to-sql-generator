import os
import sqlglot
from dotenv import load_dotenv

load_dotenv()

test_queries = [
    "SELECT c.id, c.name, COUNT(o.id) as order_count FROM customers c LEFT JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name",
    "DELETE FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)",
    "SELECT * FROM customers; DROP TABLE customers;",
    "UPDATE customers SET name = 'hacked' WHERE id = 1",
]

for query in test_queries:
    print("QUERY:", query)
    try:
        parsed_statements = sqlglot.parse(query, dialect="postgres")
        print("  Number of statements:", len(parsed_statements))
        for stmt in parsed_statements:
            print("  Statement type:", type(stmt).__name__)
    except Exception as e:
        print("  PARSE ERROR:", e)
    print()


    print("=" * 50)
print("VALIDATOR TESTS")
from sql_validator import validate_sql, SQLValidationError

for query in test_queries:
    print("QUERY:", query[:60], "...")
    try:
        validate_sql(query)
        print("  RESULT: ✅ PASSED")
    except SQLValidationError as e:
        print("  RESULT: ❌ BLOCKED —", e)
    print()


print("=" * 50)
print("SCHEMA REFERENCE TESTS")
from sqlalchemy import create_engine
from schema_service import get_schema
from sql_validator import check_schema_references

engine = create_engine(os.getenv("DATABASE_URL"))
real_schema = get_schema(engine)

schema_test_queries = [
    "SELECT c.id, c.name FROM customers c",                          # valid
    "SELECT country FROM customers",                                  # hallucinated column
    "SELECT * FROM regions",                                          # hallucinated table
]

for query in schema_test_queries:
    print("QUERY:", query)
    try:
        check_schema_references(query, real_schema)
        print("  RESULT: ✅ PASSED")
    except Exception as e:
        print("  RESULT: ❌ BLOCKED —", e)
    print()



    print("=" * 50)
print("TIMEOUT TEST")
from sqlalchemy import create_engine, text

readonly_engine = create_engine(
    os.getenv("READONLY_DATABASE_URL"),
    connect_args={"options": "-c statement_timeout=2000"},
)

try:
    with readonly_engine.connect() as conn:
        # pg_sleep(3) simulates a query that takes 3 seconds — longer than our 2s timeout
        conn.execute(text("SELECT pg_sleep(3)"))
    print("  RESULT: Query completed (unexpected — timeout should have fired)")
except Exception as e:
    print("  RESULT: ✅ Query correctly timed out —", type(e).__name__)