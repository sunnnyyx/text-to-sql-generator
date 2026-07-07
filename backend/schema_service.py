from sqlalchemy import inspect
from sqlalchemy.engine import Engine


def get_schema(engine: Engine) -> list[dict]:
    """
    Introspects the connected database and returns its schema
    as a list of table dictionaries, each containing column
    and foreign key information.
    """
    inspector = inspect(engine)
    schema = []

    for table_name in inspector.get_table_names():
        columns = []
        for col in inspector.get_columns(table_name):
            columns.append({
                "name": col["name"],
                "type": str(col["type"]),
                "nullable": col["nullable"],
            })

        pk_constraint = inspector.get_pk_constraint(table_name)
        primary_keys = pk_constraint.get("constrained_columns", [])

        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            foreign_keys.append({
                "column": fk["constrained_columns"],
                "references_table": fk["referred_table"],
                "references_column": fk["referred_columns"],
            })

        schema.append({
            "table": table_name,
            "columns": columns,
            "primary_keys": primary_keys,
            "foreign_keys": foreign_keys,
        })

    return schema

def format_schema_for_prompt(schema: list[dict]) -> str:
    """
    Converts the schema (from get_schema) into a compact,
    LLM-friendly pseudo-DDL string for use in prompts.
    """
    lines = []

    for table in schema:
        lines.append(f"Table: {table['table']}")
        for col in table["columns"]:
            pk_marker = " [PK]" if col["name"] in table["primary_keys"] else ""
            lines.append(f"  - {col['name']} ({col['type']}){pk_marker}")

        for fk in table["foreign_keys"]:
            fk_col = fk["column"][0] if fk["column"] else "?"
            ref_col = fk["references_column"][0] if fk["references_column"] else "?"
            lines.append(
                f"  FOREIGN KEY: {fk_col} -> {fk['references_table']}.{ref_col}"
            )

        lines.append("")  # blank line between tables

    return "\n".join(lines)