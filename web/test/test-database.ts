import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

export const DEFAULT_TEST_DATABASE_URL = "postgresql://dinnr:dinnr@localhost:5432/dinnr_test";

/**
 * The vitest DB URL: DINNR_TEST_DATABASE_URL (shared with pytest) with `_web`
 * appended to the database name, so pytest and vitest can run at the same time.
 * Concurrent checkouts set different base names so they don't trample each other.
 */
export function testDatabaseUrl(): string {
  const url = new URL(process.env.DINNR_TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL);
  url.pathname = `${url.pathname}_web`;
  return url.toString();
}

/** Drop and create the database named in `url`. Never point this at real data. */
export async function recreateDatabase(url: string): Promise<void> {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  if (!name) throw new Error(`no database name in ${url}`);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const ident = `"${name.replaceAll('"', '""')}"`;
    await client.query(`drop database if exists ${ident} with (force)`);
    await client.query(`create database ${ident}`);
  } finally {
    await client.end();
  }
}

/** Apply the repo's migrations using the Python side, which owns them. */
export function migrateDatabase(url: string): void {
  const scraperDir = fileURLToPath(new URL("../../scraper", import.meta.url));
  execFileSync("uv", ["run", "--project", scraperDir, "dinnr-migrate", "--database-url", url], {
    stdio: "inherit",
  });
}
