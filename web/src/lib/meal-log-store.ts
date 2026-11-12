import { useSyncExternalStore } from "react";
import { diningDate } from "./dining-date";
import { MEAL_LOG_STORAGE_KEY, parseMealLog, pruneMealLog, serializeMealLog, type MealLog } from "./meal-log";

/**
 * The on-device meal log store: one JSON value in localStorage under its own
 * key, shaped like the preferences store. Components use `useMealLog()`; the
 * shape, validation and operations live in `meal-log.ts`. The log is pruned to
 * today plus the previous 7 days whenever it's read or changed; `now` is the
 * clock that decides "today" (tests pass a fixed one).
 */

export type MealLogStore = {
  get(): MealLog;
  update(change: (current: MealLog) => MealLog): void;
  subscribe(listener: () => void): () => void;
};

export function createMealLogStore(storage: Storage, now: () => Date = () => new Date()): MealLogStore {
  let current = pruneMealLog(read(storage), diningDate(now()));
  const listeners = new Set<() => void>();
  return {
    get() {
      // A tab left open across midnight drops the day that just fell out of the window.
      // (`pruneMealLog` returns the same object when nothing drops, as `useSyncExternalStore` needs.)
      current = pruneMealLog(current, diningDate(now()));
      return current;
    },
    update(change) {
      current = pruneMealLog(change(current), diningDate(now()));
      try {
        storage.setItem(MEAL_LOG_STORAGE_KEY, serializeMealLog(current));
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

function read(storage: Storage): MealLog {
  try {
    const raw = storage.getItem(MEAL_LOG_STORAGE_KEY);
    return parseMealLog(raw === null ? null : JSON.parse(raw));
  } catch {
    return parseMealLog(null);
  }
}

let browserStore: MealLogStore | undefined;
function getBrowserStore(): MealLogStore {
  browserStore ??= createMealLogStore(window.localStorage);
  return browserStore;
}

const noop = () => {};

/**
 * The device's meal log and an updater. The log is `null` until the browser
 * store has been read (during server rendering and hydration).
 */
export function useMealLog(): [MealLog | null, MealLogStore["update"]] {
  const log = useSyncExternalStore(
    (listener) => getBrowserStore().subscribe(listener),
    () => getBrowserStore().get(),
    () => null,
  );
  return [log, typeof window === "undefined" ? noop : (change) => getBrowserStore().update(change)];
}
