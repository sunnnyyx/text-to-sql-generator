# Text-to-SQL Generator

A full-stack application that converts natural-language questions into safe, validated SQL queries and executes them against a live PostgreSQL database — built with a focus on production-style security, not just LLM output.

**Live demo:** https://text-to-sql-generator.vercel.app

> Ask a question like *"How many orders has each customer placed?"* and get back the generated SQL, a plain-English explanation, and the actual query results — without needing to know SQL yourself.

---

## Why this project is more than a wrapper around an LLM call

Naively converting English to SQL is a small project. The interesting (and hard) part is that **you cannot trust an LLM to only ever generate safe, read-only queries** — it will happily write a `DELETE` statement if the question implies one. This project's core value is the safety architecture built around the LLM, not just the LLM call itself:

- **AST-based SQL validation** (not string matching) using `sqlglot`, enforcing a strict SELECT-only allowlist
- **Schema-reference validation** that catches hallucinated tables/columns before they reach the user
- **A one-shot LLM self-correction loop** that feeds validation errors back to the model for a single repair attempt
- **A dedicated read-only database role**, enforced at the database level — not just in application code — so even a bug in the validation logic can't result in a destructive query actually running
- **Universal row-limit wrapping** and **query statement timeouts**, protecting against oversized or runaway queries regardless of what SQL the LLM produces

Every one of these layers was tested — both with an automated `pytest` suite and by deliberately trying to break the system with destructive, ambiguous, and hallucination-inducing questions.

---

## Screenshots

<img width="1376" height="768" alt="text to sql ss" src="https://github.com/user-attachments/assets/947d8367-d7b9-4f57-b8af-fe7b68f81676" />


---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind | Type-safe API contracts, fast iteration on UI states |
| Backend | FastAPI (Python) | Async-ready, Pydantic gives structured request/response validation |
| Database | PostgreSQL (hosted on [Neon](https://neon.tech)) | Rich `information_schema` support for live schema introspection |
| LLM | [Groq](https://groq.com) (`llama-3.3-70b-versatile`) | Fast inference, generous free tier, OpenAI-compatible structured JSON output |
| SQL Validation | [sqlglot](https://github.com/tobymao/sqlglot) | Parses SQL into an AST — enables real statement-type and schema-reference checks, not regex |
| Testing | pytest | 10 unit tests (validator logic, no DB dependency) + 6 integration tests (full API, real DB) |
| Deployment | Vercel (frontend) + Render (backend) + Neon (database) | All free-tier, all in the same region to minimize cross-service latency |

---

## Architecture

```
User types a question
        │
        ▼
Next.js frontend (Vercel)
        │  POST /generate-sql
        ▼
FastAPI backend (Render)
        │
        ├─→ 1. Introspect live schema (SQLAlchemy + information_schema)
        ├─→ 2. Format schema as compact pseudo-DDL for the LLM prompt
        ├─→ 3. Call Groq → structured JSON { sql, explanation }
        ├─→ 4. Validate SQL:
        │        • sqlglot parses the AST
        │        • must be exactly one statement
        │        • must be a SELECT (allowlist, not blocklist)
        │        • every referenced table/column must exist in the real schema
        ├─→ 5. If validation fails → retry once with the error fed back to the LLM
        ├─→ 6. Wrap SQL in a universal LIMIT subquery
        └─→ 7. Execute via a READ-ONLY database role, with a query timeout
        │
        ▼
PostgreSQL (Neon) — connects via a role that has SELECT-only
grants, enforced by the database itself, independent of app code
        │
        ▼
Results returned to frontend: SQL, explanation, columns, rows
```

**Defense in depth, by design:** the SQL validator, the read-only database role, and the query timeout are three independent safety layers. A bug or bypass in any one of them still leaves the others intact — this was a deliberate architectural choice, not an accident.

---

## Running Locally

### Prerequisites
- Python 3.12+
- Node.js 18+
- Docker Desktop
- A free [Groq API key](https://console.groq.com)

### 1. Clone and set up the database

```bash
git clone https://github.com/sunnnyyx/text-to-sql-generator.git
cd text-to-sql-generator
docker compose up -d
```

This starts a local PostgreSQL container with a sample `customers`/`orders` schema.

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://app_user:app_password@localhost:5432/text_to_sql_dev
READONLY_DATABASE_URL=postgresql://readonly_user:readonly_password@localhost:5432/text_to_sql_dev
GROQ_API_KEY=your_groq_api_key_here
```

Run the setup SQL in `docs/setup.sql` *(or see the schema creation commands in the codebase)* to create the read-only role and sample data, then:

```bash
uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

```bash
npm run dev
```

Frontend runs at `http://localhost:3000`.

### 4. Run the tests

```bash
cd backend
python -m pytest tests/ -v
```

---

## Known Limitations

- **Fixed sample schema**: the deployed demo always queries the same small `customers`/`orders` dataset. There's no UI yet to connect an arbitrary user-provided database.
- **Structural, not semantic, validation**: the validator guarantees generated SQL is safe (read-only, references real tables/columns) but does not guarantee it *fully* answers the question asked — e.g. a query might silently drop a clause the model couldn't fulfill (such as a column that doesn't exist), rather than erroring.
- **Column-to-table resolution is approximate**: schema validation checks that every referenced column exists *somewhere* in the schema, not that it belongs to the *correct* table in a multi-table query. This is a deliberate V1 simplification.
- **Free-tier cold starts**: both Render and Neon's free tiers suspend after inactivity; the first request after idle time can take longer than subsequent ones.

---

## What I'd Build Next

- Let users paste their own schema (as text, not a live connection) to get generated SQL without executing it — useful for people without a database to point at
- Per-table column resolution in the schema validator
- Query result caching for repeated questions
- Conversation memory for follow-up questions ("now filter that by region")

---
