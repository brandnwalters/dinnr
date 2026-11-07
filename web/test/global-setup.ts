import { migrateDatabase, recreateDatabase, testDatabaseUrl } from "./test-database";

/** Runs once per vitest run: a fresh, fully migrated test database. */
export default async function setup(): Promise<void> {
  const url = testDatabaseUrl();
  await recreateDatabase(url);
  migrateDatabase(url);
}
