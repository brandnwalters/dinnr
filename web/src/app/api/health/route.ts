import { connection } from "next/server";
import { query } from "@/lib/db";

// Liveness check that round-trips to the database. `connection()` keeps it at
// request time so the build never touches the database.
export async function GET() {
  await connection();
  const [row] = await query<{ migrations: number }>("select count(*)::int as migrations from schema_migrations");
  return Response.json({ ok: true, migrations: row.migrations });
}
