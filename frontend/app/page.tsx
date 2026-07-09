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

export default function Home() {
  const [schema, setSchema] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/schema`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((data) => setSchema(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-2xl font-bold mb-6">Text-to-SQL Generator</h1>

      <section>
        <h2 className="text-lg font-semibold mb-3">Database Schema</h2>

        {loading && <p className="text-gray-500">Loading schema...</p>}
        {error && <p className="text-red-600">Error: {error}</p>}

        {!loading && !error && (
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
    </main>
  );
}