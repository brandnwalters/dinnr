import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./test/test-database";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // All DB tests share one database and reset it, so run test files one at a time.
    fileParallelism: false,
    // The app reads DATABASE_URL; under test it points at the per-checkout test DB.
    env: { DATABASE_URL: testDatabaseUrl() },
  },
});
