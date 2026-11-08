// Favorites in on-device preferences: starred, unstarred and kept across reloads.
import { expect, test } from "vitest";
import { removeFavorite, toggleFavorite } from "./favorites";
import { memoryStorage } from "../../test/memory-storage";
import { createPreferencesStore, PREFERENCES_STORAGE_KEY } from "./preferences-store";

const chicken = { normalizedName: "grilled chicken breast", name: "Grilled Chicken Breast" };
const waffle = { normalizedName: "waffle", name: "Waffle" };

test("a starred dish is saved on the device and survives a reload", () => {
  const storage = memoryStorage();
  createPreferencesStore(storage).update((p) => ({ ...p, favorites: toggleFavorite(p.favorites, chicken) }));

  expect(createPreferencesStore(storage).get().favorites).toEqual([chicken]);
});

test("starring a favorite again unstars it, and removing drops just that dish", () => {
  const store = createPreferencesStore(memoryStorage());
  store.update((p) => ({ ...p, favorites: toggleFavorite(toggleFavorite(p.favorites, chicken), waffle) }));

  store.update((p) => ({ ...p, favorites: toggleFavorite(p.favorites, chicken) }));
  expect(store.get().favorites).toEqual([waffle]);

  store.update((p) => ({ ...p, favorites: removeFavorite(p.favorites, "waffle") }));
  expect(store.get().favorites).toEqual([]);
});

test("stored favorites are re-normalized, de-duplicated and stripped of bad entries", () => {
  const storage = memoryStorage({
    [PREFERENCES_STORAGE_KEY]: JSON.stringify({
      version: 1,
      favorites: [
        { normalizedName: "  Grilled   Chicken Breast ", name: "Grilled Chicken Breast" },
        { normalizedName: "grilled chicken breast", name: "dup" },
        { normalizedName: 42, name: "bad" },
        "waffle",
        null,
      ],
    }),
  });

  expect(createPreferencesStore(storage).get().favorites).toEqual([chicken]);
});
