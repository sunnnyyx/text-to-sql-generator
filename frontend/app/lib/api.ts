import type { QueryResult, Table } from "../types";

// Read as a literal so Next.js can inline it at build time.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    // HTTP status when the failure came from the server; undefined for network/parse failures.
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// FastAPI sends `detail` as a string for HTTPException, but as an array for request validation errors.
// For the array form, keep only the field name and message; the echoed input is not shown.
function readDetail(body: unknown): string | null {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const { loc, msg } = item as { loc?: unknown; msg?: unknown };
        if (typeof msg !== "string" || !msg.trim()) return [];
        const field = Array.isArray(loc) && typeof loc[loc.length - 1] === "string" ? loc[loc.length - 1] : null;
        return [field ? `${field}: ${msg}` : msg];
      });
      if (messages.length > 0) return messages.join("; ");
    }
  }
  return null;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchSchema(): Promise<Table[]> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/schema`);
  } catch {
    throw new ApiError("Could not reach the API server.");
  }

  const body = await readJson(res);
  if (!res.ok) {
    throw new ApiError(readDetail(body) ?? `Request failed: ${res.status}`, res.status);
  }
  if (!Array.isArray(body)) {
    throw new ApiError("Unexpected response from the schema endpoint.");
  }
  return body as Table[];
}

function isQueryResult(value: unknown): value is QueryResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sql === "string" &&
    typeof v.explanation === "string" &&
    Array.isArray(v.columns) &&
    v.columns.every((c) => typeof c === "string") &&
    Array.isArray(v.rows) &&
    v.rows.every((r) => Array.isArray(r))
  );
}

export async function generateSql(question: string): Promise<QueryResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/generate-sql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new ApiError("Could not reach the API server.");
  }

  const body = await readJson(res);
  if (!res.ok) {
    throw new ApiError(readDetail(body) ?? `Request failed: ${res.status}`, res.status);
  }
  if (!isQueryResult(body)) {
    throw new ApiError("The server returned an unexpected response.");
  }
  return body;
}
