// The on-device preferences store, against an in-memory stand-in for localStorage.
import { expect, test } from "vitest";
import { DEFAULT_PREFERENCES, PREFERENCES_STORAGE_KEY } from "./preferences";
import { memoryStorage } from "../../test/memory-storage";
import { createPreferencesStore } from "./preferences-store";

test("a device with nothing stored gets the defaults", () => {
  expect(createPreferencesStore(memoryStorage()).get()).toEqual(DEFAULT_PREFERENCES);
});

test("diet filters survive a reload (a new store over the same storage)", () => {
  const storage = memoryStorage();
  createPreferencesStore(storage).update((p) => ({ ...p, dietFilters: ["vegan", "halal"] }));

  const afterReload = createPreferencesStore(storage);

  expect(afterReload.get().dietFilters).toEqual(["vegan", "halal"]);
});

test("turning a filter off is saved too", () => {
  const storage = memoryStorage();
  const store = createPreferencesStore(storage);
  store.update((p) => ({ ...p, dietFilters: ["vegan"] }));
  store.update((p) => ({ ...p, dietFilters: [] }));

  expect(createPreferencesStore(storage).get().dietFilters).toEqual([]);
});

test("subscribers hear about updates", () => {
  const store = createPreferencesStore(memoryStorage());
  const seen: string[][] = [];
  store.subscribe(() => seen.push(store.get().dietFilters));

  store.update((p) => ({ ...p, dietFilters: ["organic"] }));

  expect(seen).toEqual([["organic"]]);
});

test("corrupt or unknown stored data falls back to defaults, field by field", () => {
  const corrupt = memoryStorage({ [PREFERENCES_STORAGE_KEY]: "{not json" });
  expect(createPreferencesStore(corrupt).get()).toEqual(DEFAULT_PREFERENCES);

  const partlyValid = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({ version: 1, dietFilters: ["vegan", "keto", 7, "vegan"] }),
  });
  expect(createPreferencesStore(partlyValid).get().dietFilters).toEqual(["vegan"]);

  const fromTheFuture = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({ version: 999, dietFilters: ["vegan"] }),
  });
  expect(createPreferencesStore(fromTheFuture).get()).toEqual(DEFAULT_PREFERENCES);

  const unknownOldVersion = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({ version: 0, dietFilters: ["vegan"] }),
  });
  expect(createPreferencesStore(unknownOldVersion).get()).toEqual(DEFAULT_PREFERENCES);
});

test("a device where storage throws (private mode, quota) still works for the session", () => {
  const broken = memoryStorage();
  broken.getItem = () => {
    throw new Error("SecurityError");
  };
  broken.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  const store = createPreferencesStore(broken);

  store.update((p) => ({ ...p, dietFilters: ["vegan"] }));

  expect(store.get().dietFilters).toEqual(["vegan"]);
});

test("allergen choices survive a reload, and unknown codes are dropped", () => {
  const storage = memoryStorage();
  createPreferencesStore(storage).update((p) => ({ ...p, allergens: ["peanut", "tree_nuts"] }));

  expect(createPreferencesStore(storage).get().allergens).toEqual(["peanut", "tree_nuts"]);

  const tampered = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({ version: 1, allergens: ["milk", "has_egg", 3, "milk"] }),
  });
  expect(createPreferencesStore(tampered).get().allergens).toEqual(["milk"]);
});

test("preferences stored before allergens existed keep their diet filters and get no allergens", () => {
  const old = memoryStorage({ [PREFERENCES_STORAGE_KEY]: JSON.stringify({ version: 1, dietFilters: ["halal"] }) });

  expect(createPreferencesStore(old).get()).toMatchObject({ dietFilters: ["halal"], allergens: [] });
});
