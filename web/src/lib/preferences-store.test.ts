// The on-device preferences store, against an in-memory stand-in for localStorage.
import { expect, test } from "vitest";
import { DEFAULT_PREFERENCES } from "./preferences";
import { createPreferencesStore, PREFERENCES_STORAGE_KEY } from "./preferences-store";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

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
