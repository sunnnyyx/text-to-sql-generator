import type { Cell } from "../types";

// Matches the default row limit in backend/main.py (enforce_row_limit). Results at this size may be truncated.
const ROW_LIMIT = 100;

interface ResultsTableProps {
  columns: string[];
  rows: Cell[][];
}

function formatCell(value: Cell): { text: string; isNull: boolean; isNumeric: boolean } {
  if (value === null) return { text: "null", isNull: true, isNumeric: false };
  if (typeof value === "number") return { text: String(value), isNull: false, isNumeric: true };
  if (typeof value === "object") return { text: JSON.stringify(value), isNull: false, isNumeric: false };
  return { text: String(value), isNull: false, isNumeric: false };
}

export default function ResultsTable({ columns, rows }: ResultsTableProps) {
  const rowCount = rows.length;
  const rowLabel = rowCount === 1 ? "row" : "rows";

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="results-heading" className="text-sm font-semibold text-slate-900">
          Results
        </h2>
        <span className="text-xs text-slate-500">
          {rowCount} {rowLabel}
          {rowCount >= ROW_LIMIT && ` · capped at ${ROW_LIMIT} rows`}
        </span>
      </div>

      {rowCount === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
          The query ran successfully but returned no rows.
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="w-12 border-b border-slate-200 px-3 py-2 font-medium text-slate-400">
                  #
                </th>
                {columns.map((col, index) => (
                  <th
                    key={`${col}-${index}`}
                    scope="col"
                    className="border-b border-slate-200 px-3 py-2 font-semibold"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/60">
                  <td className="px-3 py-2 align-top font-mono text-xs text-slate-400">{rowIndex + 1}</td>
                  {columns.map((_, colIndex) => {
                    const { text, isNull, isNumeric } = formatCell(row[colIndex] ?? null);
                    return (
                      <td
                        key={colIndex}
                        className={`max-w-xs px-3 py-2 align-top break-words [overflow-wrap:anywhere] text-slate-800 ${
                          isNumeric ? "text-right font-mono tabular-nums" : ""
                        }`}
                      >
                        {isNull ? <span className="italic text-slate-400">null</span> : text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
