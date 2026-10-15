"use client";

import { useEffect, useRef, useState } from "react";
import QueryComposer from "./components/QueryComposer";
import ResultsTable from "./components/ResultsTable";
import SchemaPanel from "./components/SchemaPanel";
import SqlPanel from "./components/SqlPanel";
import { ApiError, fetchSchema, generateSql } from "./lib/api";
import type { QueryResult, Table } from "./types";

interface QueryFailure {
  title: string;
  message: string;
}

// Status codes come from backend/main.py: 422 = SQL generation failed, 504 = timeout, 500 = any server-side failure
// (including LLM generation, so the wording stays neutral).
function describeFailure(err: unknown): QueryFailure {
  if (!(err instanceof ApiError)) {
    return { title: "Request failed", message: "Something went wrong. Please try again." };
  }
  switch (err.status) {
    case 422:
      return { title: "Could not generate a valid query", message: err.message };
    case 504:
      return { title: "The query timed out", message: err.message };
    case 500:
      return { title: "The request failed on the server.", message: err.message };
    default:
      return { title: "Request failed", message: err.message };
  }
}

export default function Home() {
  const [schema, setSchema] = useState<Table[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryFailure, setQueryFailure] = useState<QueryFailure | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  // Set synchronously so a fast double-submit cannot start a second request before the disabled state renders.
  const requestInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchSchema()
      .then((tables) => {
        if (!cancelled) setSchema(tables);
      })
      .catch((err: unknown) => {
        if (!cancelled) setSchemaError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleQuestionChange(value: string) {
    setQuestion(value);
    if (validationError) setValidationError(null);
  }

  async function handleSubmit() {
    if (requestInFlight.current) return;

    const trimmed = question.trim();
    if (!trimmed) {
      setValidationError("Enter a question before generating SQL.");
      inputRef.current?.focus();
      return;
    }

    requestInFlight.current = true;
    setValidationError(null);
    setQueryLoading(true);
    setQueryFailure(null);
    setQueryResult(null);

    try {
      const result = await generateSql(trimmed);
      setQueryResult(result);
    } catch (err) {
      setQueryFailure(describeFailure(err));
    } finally {
      requestInFlight.current = false;
      setQueryLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 font-mono text-xs font-bold text-white">
            SQL
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold leading-tight">Text-to-SQL Generator</h1>
            <p className="text-xs text-slate-500">
              Ask in plain English. Read-only, validated SQL runs against the live database.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] lg:items-start">
        <div className="order-2 lg:order-1">
          <SchemaPanel schema={schema} loading={schemaLoading} error={schemaError} />
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-8 lg:order-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <QueryComposer
              schema={schema}
              question={question}
              onQuestionChange={handleQuestionChange}
              onSubmit={handleSubmit}
              loading={queryLoading}
              validationError={validationError}
              inputRef={inputRef}
            />
          </div>

          {queryLoading && (
            <p role="status" className="text-sm text-slate-600">
              Generating SQL, validating it, and running it against the database…
            </p>
          )}

          {queryFailure && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            >
              <p className="font-semibold">{queryFailure.title}</p>
              <p className="mt-1 text-red-800">{queryFailure.message}</p>
            </div>
          )}

          {queryResult && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <SqlPanel sql={queryResult.sql} explanation={queryResult.explanation} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <ResultsTable columns={queryResult.columns} rows={queryResult.rows} />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
