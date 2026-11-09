// Preference parsing: the Appearance `theme` field and what the Today query reads.
import { expect, test } from "vitest";
import { DEFAULT_PREFERENCES, parsePreferences, todayQueryPreferences } from "./preferences";

test("the theme defaults to following the system", () => {
  expect(DEFAULT_PREFERENCES.theme).toBe("system");
  expect(parsePreferences({}).theme).toBe("system");
});

test("a valid theme is kept", () => {
  expect(parsePreferences({ theme: "light" }).theme).toBe("light");
  expect(parsePreferences({ theme: "dark" }).theme).toBe("dark");
  expect(parsePreferences({ theme: "system" }).theme).toBe("system");
});

test("an invalid theme falls back to system without touching other fields", () => {
  for (const theme of ["Dark", "blue", 1, null, ["dark"]]) {
    const prefs = parsePreferences({ theme, dietFilters: ["vegan"] });
    expect(prefs.theme).toBe("system");
    expect(prefs.dietFilters).toEqual(["vegan"]);
  }
});

test("stored version 1 data without a theme still reads (no version bump)", () => {
  const prefs = parsePreferences({ version: 1, allergens: ["milk"] });
  expect(prefs.allergens).toEqual(["milk"]);
  expect(prefs.theme).toBe("system");
});

test("the theme is not part of the Today query, so changing it doesn't reload menus", () => {
  const light = todayQueryPreferences({ ...DEFAULT_PREFERENCES, theme: "light" });
  const dark = todayQueryPreferences({ ...DEFAULT_PREFERENCES, theme: "dark" });

  expect(light).not.toHaveProperty("theme");
  expect(JSON.stringify(light)).toBe(JSON.stringify(dark));
});
