// Smoke test: old Combos links and bookmarks land on Macros. Next passes the
// request's query (?meal=, ?hall=) through to a config redirect's destination.
import { expect, test } from "vitest";
import nextConfig from "../../../next.config";

test("the old Combos URL redirects to Macros", async () => {
  const redirects = (await nextConfig.redirects?.()) ?? [];

  expect(redirects).toContainEqual({ source: "/combos", destination: "/macros", permanent: true });
});
