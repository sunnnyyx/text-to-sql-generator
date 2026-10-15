"use client";

import { useEffect, useState } from "react";

interface SqlPanelProps {
  sql: string;
  explanation: string;
}

type CopyState = "idle" | "copied" | "failed";

export default function SqlPanel({ sql, explanation }: SqlPanelProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Reset the "Copied" / "failed" label after a moment; the timer is cleared on unmount.
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  async function copySql() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(sql);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section aria-labelledby="sql-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="sql-heading" className="text-sm font-semibold text-slate-900">
          Generated SQL
        </h2>
        <div className="flex items-center gap-2">
          {copyState === "failed" && (
            <span role="status" className="text-xs text-red-700">
              Copy failed. Select the SQL and copy it manually.
            </span>
          )}
          <button
            type="button"
            onClick={copySql}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {copyState === "copied" ? (
              <>
                <span aria-hidden="true" className="text-emerald-600">✓</span>
                <span role="status">Copied</span>
              </>
            ) : (
              "Copy SQL"
            )}
          </button>
        </div>
      </div>

      <pre
        tabIndex={0}
        aria-label="Generated SQL query"
        className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 font-mono text-sm leading-relaxed text-emerald-300 whitespace-pre focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {sql}
      </pre>

      {explanation && (
        <p className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          {explanation}
        </p>
      )}
    </section>
  );
}
