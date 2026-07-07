import sqlglot
from sqlglot import expressions as exp
from sqlglot.expressions import Select


class SQLValidationError(Exception):
    """Raised when generated SQL fails a safety check."""
    pass


def validate_sql(sql: str) -> None:
    """
    Validates that the given SQL string is a single, safe,
    read-only SELECT statement. Raises SQLValidationError if not.
    Returns None if validation passes.
    """
    try:
        statements = sqlglot.parse(sql, dialect="postgres")
    except Exception as e:
        raise SQLValidationError(f"SQL failed to parse: {e}")

    if len(statements) != 1:
        raise SQLValidationError(
            f"Expected exactly one SQL statement, found {len(statements)}."
        )

    statement = statements[0]

    if statement is None:
        raise SQLValidationError("SQL statement could not be parsed.")

    if not isinstance(statement, Select):
        raise SQLValidationError(
            f"Only SELECT statements are allowed. Got: {type(statement).__name__}."
        )


def check_schema_references(sql: str, schema: list[dict]) -> None:
    """
    Validates that every table and column referenced in the SQL
    actually exists in the real database schema. Raises
    SQLValidationError if an unknown table or column is found.
    """
    known_tables = {table["table"].lower() for table in schema}

    known_columns = set()
    for table in schema:
        for col in table["columns"]:
            known_columns.add(col["name"].lower())

    statement = sqlglot.parse_one(sql, dialect="postgres")

    referenced_tables = {t.name.lower() for t in statement.find_all(exp.Table)}
    unknown_tables = referenced_tables - known_tables
    if unknown_tables:
        raise SQLValidationError(
            f"Query references unknown table(s): {', '.join(unknown_tables)}."
        )

    referenced_columns = set()
    for col in statement.find_all(exp.Column):
        if col.name != "*":
            referenced_columns.add(col.name.lower())

    unknown_columns = referenced_columns - known_columns
    if unknown_columns:
        raise SQLValidationError(
            f"Query references unknown column(s): {', '.join(unknown_columns)}."
        )