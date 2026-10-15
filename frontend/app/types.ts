// Mirrors the response shapes returned by backend/main.py and backend/schema_service.py.

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

export interface ForeignKey {
  column: string[];
  references_table: string;
  references_column: string[];
}

export interface Table {
  table: string;
  columns: Column[];
  primary_keys: string[];
  foreign_keys: ForeignKey[];
}

// FastAPI serializes Postgres values to JSON, so a cell can be any JSON scalar.
export type Cell = string | number | boolean | null | Record<string, unknown> | unknown[];

export interface QueryResult {
  sql: string;
  explanation: string;
  columns: string[];
  rows: Cell[][];
  row_count: number;
}
