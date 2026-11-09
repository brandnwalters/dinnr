// Macro targets (combos, #13) in the on-device preferences store, against an in-memory localStorage.
import { expect, test } from "vitest";
import { parsePreferences, PREFERENCES_STORAGE_KEY } from "./preferences";
import { memoryStorage } from "../../test/memory-storage";
import { createPreferencesStore } from "./preferences-store";

test("no targets are set by default", () => {
  expect(createPreferencesStore(memoryStorage()).get().macroTargets).toEqual({});
});

test("macro targets survive a reload", () => {
  const storage = memoryStorage();
  createPreferencesStore(storage).update((p) => ({
    ...p,
    macroTargets: { proteinG: { min: 40 }, calories: { max: 700 }, carbsG: { min: 50, max: 90 } },
  }));

  const afterReload = createPreferencesStore(storage);

  expect(afterReload.get().macroTargets).toEqual({
    proteinG: { min: 40 },
    calories: { max: 700 },
    carbsG: { min: 50, max: 90 },
  });
});

test("clearing a target is saved too", () => {
  const storage = memoryStorage();
  const store = createPreferencesStore(storage);
  store.update((p) => ({ ...p, macroTargets: { proteinG: { min: 40 }, fatG: { max: 30 } } }));
  store.update((p) => ({ ...p, macroTargets: { fatG: { max: 30 } } }));

  expect(createPreferencesStore(storage).get().macroTargets).toEqual({ fatG: { max: 30 } });
});

test("bad stored targets are dropped, good ones kept, other preferences untouched", () => {
  const storage = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({
      version: 1,
      dietFilters: ["vegan"],
      macroTargets: {
        proteinG: { min: 40, max: "lots" },
        calories: { min: -5, max: 800 },
        fatG: "high",
        sugar: { max: 10 },
        carbsG: { min: null },
      },
    }),
  });

  const prefs = createPreferencesStore(storage).get();

  expect(prefs.macroTargets).toEqual({ proteinG: { min: 40 }, calories: { max: 800 } });
  expect(prefs.dietFilters).toEqual(["vegan"]);
});

test("a stored minimum above its maximum is kept as entered (the combos just won't fit)", () => {
  expect(parsePreferences({ macroTargets: { proteinG: { min: 60, max: 40 } } }).macroTargets).toEqual({
    proteinG: { min: 60, max: 40 },
  });
});

test("condiment-type stations are left out of combos by default, and turning them on survives a reload", () => {
  const storage = memoryStorage();
  expect(createPreferencesStore(storage).get().includeExcludedStations).toBe(false);

  createPreferencesStore(storage).update((p) => ({ ...p, includeExcludedStations: true }));

  expect(createPreferencesStore(storage).get().includeExcludedStations).toBe(true);
  expect(parsePreferences({ includeExcludedStations: "yes" }).includeExcludedStations).toBe(false);
});
