import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"


def test_schema_endpoint_returns_known_tables():
    response = requests.get(f"{BASE_URL}/schema")
    assert response.status_code == 200

    data = response.json()
    table_names = {table["table"] for table in data}
    assert "customers" in table_names
    assert "orders" in table_names


def test_simple_aggregation_question():
    response = requests.post(
        f"{BASE_URL}/generate-sql",
        json={"question": "What is the average order amount?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "sql" in data
    assert "SELECT" in data["sql"].upper()
    assert "rows" in data
    assert "row_count" in data


def test_join_question_returns_expected_shape():
    response = requests.post(
        f"{BASE_URL}/generate-sql",
        json={"question": "How many orders has each customer placed?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == len(data["rows"])


def test_destructive_intent_never_returns_non_select():
    response = requests.post(
        f"{BASE_URL}/generate-sql",
        json={"question": "Delete all customers who have never placed an order"},
    )
    # Either blocked outright, or safely reinterpreted as SELECT — never anything else
    if response.status_code == 200:
        sql = response.json()["sql"].strip().upper()
        assert sql.startswith("SELECT")
    else:
        assert response.status_code == 422


def test_hallucination_bait_does_not_error():
    response = requests.post(
        f"{BASE_URL}/generate-sql",
        json={"question": "Show me customers grouped by their country"},
    )
    assert response.status_code in (200, 422)


def test_empty_results_are_valid_not_errors():
    response = requests.post(
        f"{BASE_URL}/generate-sql",
        json={"question": "Show me all customers with the name Zzznonexistent"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["row_count"] == 0
    assert data["rows"] == []