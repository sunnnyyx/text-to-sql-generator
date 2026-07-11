"use client";

import { useEffect, useState } from "react";

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface ForeignKey {
  column: string[];
  references_table: string;
  references_column: string[];
}

interface Table {
  table: string;
  columns: Column[];
  primary_keys: string[];
  foreign_keys: ForeignKey[];
}

interface QueryResult {
  sql: string;
  explanation: string;
  columns: string[];
  rows: (string | number | null)[][];
  row_count: number;
}

export default function Home() {
  const [schema, setSchema] = useState<Table[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/schema`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setSchema(data))
      .catch((err) => setSchemaError(err.message))
      .finally(() => setSchemaLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;

    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/generate-sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || `Request failed: ${res.status}`);
      }

      setQueryResult(data);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setQueryLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Text-to-SQL Generator</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Database Schema</h2>

        {schemaLoading && <p className="text-gray-500">Loading schema...</p>}
        {schemaError && <p className="text-red-600">Error: {schemaError}</p>}

        {!schemaLoading && !schemaError && (
          <div className="grid gap-4 md:grid-cols-2">
            {schema.map((table) => (
              <div
                key={table.table}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <h3 className="font-mono font-semibold text-blue-700 mb-2">
                  {table.table}
                </h3>
                <ul className="text-sm space-y-1">
                  {table.columns.map((col) => (
                    <li key={col.name} className="font-mono">
                      {col.name}{" "}
                      <span className="text-gray-400">({col.type})</span>
                      {table.primary_keys.includes(col.name) && (
                        <span className="text-xs text-amber-600 ml-1">
                          PK
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {table.foreign_keys.map((fk, i) => (
                  <p key={i} className="text-xs text-gray-500 mt-2">
                    FK: {fk.column[0]} → {fk.references_table}.
                    {fk.references_column[0]}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Ask a Question</h2>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How many orders has each customer placed?"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={queryLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {queryLoading ? "Generating..." : "Submit"}
          </button>
        </form>

        {queryError && (
          <p className="text-red-600 text-sm mb-4">Error: {queryError}</p>
        )}

        {queryResult && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                Generated SQL
              </h3>
              <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-auto font-mono">
                {queryResult.sql}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
              {queryResult.explanation}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-1">
                Results ({queryResult.row_count}{" "}
                {queryResult.row_count === 1 ? "row" : "rows"})
              </h3>

              {queryResult.row_count === 0 ? (
                <p className="text-gray-500 text-sm italic">
                  No matching data found.
                </p>
              ) : (
                <div className="overflow-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th
                            key={col}
                            className="text-left px-3 py-2 font-semibold text-gray-700"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-100 even:bg-gray-50"
                        >
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2">
                              {cell === null ? (
                                <span className="text-gray-400 italic">
                                  null
                                </span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}