import { useSyncExternalStore } from "react";
import { parsePreferences, PREFERENCES_STORAGE_KEY, serializePreferences, type Preferences } from "./preferences";

/**
 * The on-device preferences store: one JSON value in localStorage, no account.
 * Components use `usePreferences()`; the shape and validation live in
 * `preferences.ts` (add new fields there, not here).
 */

export { PREFERENCES_STORAGE_KEY };

export type PreferencesStore = {
  get(): Preferences;
  update(change: (current: Preferences) => Preferences): void;
  subscribe(listener: () => void): () => void;
};

export function createPreferencesStore(storage: Storage): PreferencesStore {
  let current = read(storage);
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    update(change) {
      current = parsePreferences(change(current));
      try {
        storage.setItem(PREFERENCES_STORAGE_KEY, serializePreferences(current));
      } catch {
        // Storage full or blocked: keep the change for this session only.
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function read(storage: Storage): Preferences {
  try {
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    return parsePreferences(raw === null ? null : JSON.parse(raw));
  } catch {
    return parsePreferences(null);
  }
}

let browserStore: PreferencesStore | undefined;
function getBrowserStore(): PreferencesStore {
  browserStore ??= createPreferencesStore(window.localStorage);
  return browserStore;
}

const noop = () => {};

/**
 * The device's preferences and an updater. Preferences are `null` until the
 * browser store has been read (during server rendering and hydration), so
 * callers can wait instead of flashing content meant for the defaults.
 */
export function usePreferences(): [Preferences | null, PreferencesStore["update"]] {
  const prefs = useSyncExternalStore(
    (listener) => getBrowserStore().subscribe(listener),
    () => getBrowserStore().get(),
    () => null,
  );
  return [prefs, typeof window === "undefined" ? noop : (change) => getBrowserStore().update(change)];
}
