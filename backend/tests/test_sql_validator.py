import pytest
from sql_validator import validate_sql, check_schema_references, SQLValidationError

def test_valid_select_passes():
    validate_sql("SELECT id, name FROM customers")


def test_delete_is_blocked():
    with pytest.raises(SQLValidationError):
        validate_sql("DELETE FROM customers WHERE id = 1")


def test_update_is_blocked():
    with pytest.raises(SQLValidationError):
        validate_sql("UPDATE customers SET name = 'x' WHERE id = 1")


def test_drop_is_blocked():
    with pytest.raises(SQLValidationError):
        validate_sql("DROP TABLE customers")


def test_multi_statement_injection_is_blocked():
    with pytest.raises(SQLValidationError):
        validate_sql("SELECT * FROM customers; DROP TABLE customers;")


def test_unparseable_sql_is_blocked():
    with pytest.raises(SQLValidationError):
        validate_sql("THIS IS NOT VALID SQL AT ALL !!!")


# --- Schema reference validation tests ---

SAMPLE_SCHEMA = [
    {
        "table": "customers",
        "columns": [
            {"name": "id", "type": "INTEGER", "nullable": False},
            {"name": "name", "type": "VARCHAR(100)", "nullable": False},
            {"name": "email", "type": "VARCHAR(100)", "nullable": True},
        ],
        "primary_keys": ["id"],
        "foreign_keys": [],
    },
    {
        "table": "orders",
        "columns": [
            {"name": "id", "type": "INTEGER", "nullable": False},
            {"name": "customer_id", "type": "INTEGER", "nullable": True},
            {"name": "amount", "type": "NUMERIC(10,2)", "nullable": False},
        ],
        "primary_keys": ["id"],
        "foreign_keys": [],
    },
]


def test_valid_schema_reference_passes():
    check_schema_references("SELECT id, name FROM customers", SAMPLE_SCHEMA)


def test_hallucinated_column_is_blocked():
    with pytest.raises(SQLValidationError):
        check_schema_references("SELECT country FROM customers", SAMPLE_SCHEMA)


def test_hallucinated_table_is_blocked():
    with pytest.raises(SQLValidationError):
        check_schema_references("SELECT * FROM regions", SAMPLE_SCHEMA)


def test_valid_join_across_known_tables_passes():
    check_schema_references(
        "SELECT c.name, o.amount FROM customers c JOIN orders o ON c.id = o.customer_id",
        SAMPLE_SCHEMA,
    )