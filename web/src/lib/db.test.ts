import { afterAll, expect, test } from "vitest";
import { closeDb, query } from "./db";

afterAll(closeDb);

test("the app's database client talks to the migrated test database", async () => {
  const rows = await query<{ name: string }>("select name from schema_migrations order by name");

  expect(rows.map((r) => r.name)).toContain("0001_baseline.sql");
});
