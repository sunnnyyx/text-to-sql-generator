import { useId, type FormEvent, type RefObject } from "react";
import type { Table } from "../types";

interface ExamplePrompt {
  text: string;
  // Tables and columns the question depends on. Shown only when the loaded schema has them all.
  requires: Record<string, string[]>;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    text: "How many orders has each customer placed?",
    requires: { customers: ["id", "name"], orders: ["customer_id"] },
  },
  {
    text: "Which customers have placed the most orders?",
    requires: { customers: ["id", "name"], orders: ["customer_id"] },
  },
  {
    text: "What is the total order amount for each customer?",
    requires: { customers: ["id", "name"], orders: ["customer_id", "amount"] },
  },
  {
    text: "Show orders placed after 2025-01-01",
    requires: { orders: ["id", "order_date"] },
  },
];

function availableExamples(schema: Table[]): string[] {
  return EXAMPLE_PROMPTS.filter((example) =>
    Object.entries(example.requires).every(([tableName, columns]) => {
      const table = schema.find((t) => t.table === tableName);
      return table !== undefined && columns.every((c) => table.columns.some((col) => col.name === c));
    }),
  ).map((example) => example.text);
}

interface QueryComposerProps {
  schema: Table[];
  question: string;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  validationError: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function QueryComposer({
  schema,
  question,
  onQuestionChange,
  onSubmit,
  loading,
  validationError,
  inputRef,
}: QueryComposerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const examples = availableExamples(schema);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <section aria-labelledby={`${inputId}-label`} className="flex flex-col gap-3">
      <div>
        <h2 id={`${inputId}-label`} className="text-sm font-semibold text-slate-900">
          Ask a question
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Describe the data you want in plain English. The SQL is validated on the server before it runs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row" noValidate>
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Natural-language question
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            placeholder="e.g. How many orders has each customer placed?"
            autoComplete="off"
            aria-invalid={validationError ? true : undefined}
            aria-describedby={validationError ? errorId : undefined}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 aria-[invalid=true]:border-red-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-indigo-400"
        >
          {loading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {loading ? "Generating…" : "Generate SQL"}
        </button>
      </form>

      {validationError && (
        <p id={errorId} className="text-sm text-red-700">
          {validationError}
        </p>
      )}

      {examples.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-500">Try an example</span>
          <div className="flex flex-wrap gap-2">
            {examples.map((text) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  onQuestionChange(text);
                  inputRef.current?.focus();
                }}
                disabled={loading}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-left text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
