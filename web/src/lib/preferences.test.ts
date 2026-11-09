// Preference parsing: the Appearance `theme` field, what the Today query reads, and clearing filters.
import { expect, test } from "vitest";
import { clearFilters, DEFAULT_PREFERENCES, parsePreferences, todayQueryPreferences } from "./preferences";

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

test("Clear filters turns off the diet and allergen filters and keeps everything else", () => {
  const favorites = [{ normalizedName: "penne alfredo", name: "Penne Alfredo" }];
  const prefs = parsePreferences({
    dietFilters: ["vegan", "halal"],
    allergens: ["milk"],
    favorites,
    theme: "dark",
    includeExcludedStations: true,
  });
  const cleared = clearFilters(prefs);
  expect(cleared.dietFilters).toEqual([]);
  expect(cleared.allergens).toEqual([]);
  expect(cleared.favorites).toEqual(favorites);
  expect(cleared.theme).toBe("dark");
  expect(cleared.includeExcludedStations).toBe(true);
});
