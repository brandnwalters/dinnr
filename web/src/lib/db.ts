import { Pool, type QueryResultRow } from "pg";

// Server-only database access. The web app only reads; the Python scraper owns
// the schema (see ../migrations).
const DEFAULT_DATABASE_URL = "postgresql://dinnr:dinnr@localhost:5432/dinnr";

let pool: Pool | undefined;

function getPool(): Pool {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL });
  return pool;
}

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}
