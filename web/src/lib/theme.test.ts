// The pre-paint theme script: which theme the page is drawn in, from the stored Appearance choice.
import { expect, test } from "vitest";
import { memoryStorage } from "../../test/memory-storage";
import { PREFERENCES_STORAGE_KEY } from "./preferences-store";
import { THEME_SCRIPT } from "./theme";

/** Runs the inline script the way the browser would, against stand-ins for its globals. */
function themeOnLoad(stored: string | null, { systemDark = false, storageThrows = false } = {}) {
  const attributes: Record<string, string> = {};
  const document = { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } };
  const storage = memoryStorage(stored === null ? {} : { [PREFERENCES_STORAGE_KEY]: stored });
  const localStorage = storageThrows
    ? {
        getItem: () => {
          throw new Error("blocked");
        },
      }
    : storage;
  const matchMedia = (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" && systemDark });
  new Function("document", "localStorage", "matchMedia", THEME_SCRIPT)(document, localStorage, matchMedia);
  return attributes["data-theme"];
}

test("a saved Dark or Light choice is applied regardless of the phone's setting", () => {
  expect(themeOnLoad(JSON.stringify({ version: 1, theme: "dark" }))).toBe("dark");
  expect(themeOnLoad(JSON.stringify({ version: 1, theme: "light" }), { systemDark: true })).toBe("light");
});

test("System, or nothing saved, follows prefers-color-scheme", () => {
  expect(themeOnLoad(JSON.stringify({ version: 1, theme: "system" }), { systemDark: true })).toBe("dark");
  expect(themeOnLoad(null, { systemDark: true })).toBe("dark");
  expect(themeOnLoad(null)).toBe("light");
});

test("unreadable stored data follows the system, like the preferences parser", () => {
  expect(themeOnLoad("{not json", { systemDark: true })).toBe("dark");
  expect(themeOnLoad(JSON.stringify({ version: 1, theme: "blue" }), { systemDark: true })).toBe("dark");
  expect(themeOnLoad(JSON.stringify({ version: 2, theme: "light" }), { systemDark: true })).toBe("dark");
  expect(themeOnLoad(null, { systemDark: true, storageThrows: true })).toBe("dark");
});
