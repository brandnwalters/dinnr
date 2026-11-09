// Theme tokens: every token defined for light mode also has a dark value.
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** The custom properties declared in the first rule block for `selector`. */
function tokensIn(selector: string): string[] {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block`).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf("}", start));
  return [...block.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
}

test("every theme token has a dark value", () => {
  const light = tokensIn(":root").filter((token) => token !== "--radius");
  const dark = tokensIn('[data-theme="dark"]');

  expect(light.length).toBeGreaterThan(0);
  expect(light.filter((token) => !dark.includes(token))).toEqual([]);
});
