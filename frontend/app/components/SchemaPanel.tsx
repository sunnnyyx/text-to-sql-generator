import type { Table } from "../types";

interface SchemaPanelProps {
  schema: Table[];
  loading: boolean;
  error: string | null;
}

export default function SchemaPanel({ schema, loading, error }: SchemaPanelProps) {
  const relationships = schema.flatMap((table) =>
    table.foreign_keys.map((fk) => ({
      from: `${table.table}.${fk.column.join(", ")}`,
      to: `${fk.references_table}.${fk.references_column.join(", ")}`,
    })),
  );

  return (
    <section aria-labelledby="schema-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="schema-heading" className="text-sm font-semibold text-slate-900">
          Database schema
        </h2>
        {!loading && !error && (
          <span className="text-xs text-slate-500">
            {schema.length} {schema.length === 1 ? "table" : "tables"}
          </span>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading schema…</p>}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          Could not load schema: {error}
        </p>
      )}

      {!loading && !error && schema.length === 0 && (
        <p className="text-sm text-slate-500">No tables were found in this database.</p>
      )}

      {!loading && !error && relationships.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Relationships
          </h3>
          <ul className="flex flex-col gap-1.5">
            {relationships.map((rel) => (
              <li key={`${rel.from}->${rel.to}`} className="font-mono text-xs text-slate-700">
                <span className="text-indigo-700">{rel.from}</span>
                <span aria-hidden="true" className="px-1 text-slate-400">
                  →
                </span>
                <span className="sr-only">references</span>
                <span className="text-indigo-700">{rel.to}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading &&
        !error &&
        schema.map((table) => {
          const primaryKeys = new Set(table.primary_keys);
          const foreignKeyColumns = new Set(table.foreign_keys.flatMap((fk) => fk.column));

          return (
            <article
              key={table.table}
              aria-label={`Table ${table.table}`}
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            >
              <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h3 className="font-mono text-sm font-semibold text-slate-900">{table.table}</h3>
                <span className="text-xs text-slate-500">
                  {table.columns.length} {table.columns.length === 1 ? "column" : "columns"}
                </span>
              </header>

              <ul className="divide-y divide-slate-100">
                {table.columns.map((col) => (
                  <li
                    key={col.name}
                    className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 break-all font-mono text-slate-900">{col.name}</span>
                    {primaryKeys.has(col.name) && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        PK
                      </span>
                    )}
                    {foreignKeyColumns.has(col.name) && (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-800">
                        FK
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs text-slate-500">{col.type}</span>
                    {!col.nullable && (
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        not null
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {table.foreign_keys.length > 0 && (
                <footer className="border-t border-slate-200 bg-slate-50 px-3 py-2">
                  <ul className="flex flex-col gap-1">
                    {table.foreign_keys.map((fk) => (
                      <li
                        key={`${fk.column.join(",")}-${fk.references_table}`}
                        className="font-mono text-xs text-slate-600"
                      >
                        {fk.column.join(", ")} → {fk.references_table}.
                        {fk.references_column.join(", ")}
                      </li>
                    ))}
                  </ul>
                </footer>
              )}
            </article>
          );
        })}
    </section>
  );
}
