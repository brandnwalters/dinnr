import { isDietaryTag, type DietaryTag } from "./dietary-tags";
import { parseFavorites, type FavoriteDish } from "./favorites";

/**
 * On-device preferences (no accounts): the shape, defaults and validation.
 * Pure and isomorphic: the browser store (`preferences-store.ts`) persists it
 * in localStorage, and the server re-validates whatever the client sends.
 *
 * To add a preference field (allergens, favorites, macro goals, ...):
 *   1. add it to `Preferences`,
 *   2. add its default to `DEFAULT_PREFERENCES`,
 *   3. add a parser to `FIELD_PARSERS` (return `undefined` for invalid input,
 *      which falls back to the default).
 * Stored data without the new field just gets the default, so adding a field
 * needs no version bump. Bump `PREFERENCES_VERSION` (and add a step to
 * `MIGRATIONS`) only when an existing field changes meaning or shape.
 */

export type Preferences = {
  /** Strict cutoffs: an item must carry every one of these tags to be shown. */
  dietFilters: DietaryTag[];
  /** Starred dishes, matched by normalized name at any station or hall (see `favorites.ts`). */
  favorites: FavoriteDish[];
};

export const PREFERENCES_VERSION = 1;

export const DEFAULT_PREFERENCES: Preferences = {
  dietFilters: [],
  favorites: [],
};

type FieldParsers = { [K in keyof Preferences]: (raw: unknown) => Preferences[K] | undefined };

const FIELD_PARSERS: FieldParsers = {
  dietFilters: (raw) => (Array.isArray(raw) ? [...new Set(raw.filter(isDietaryTag))] : undefined),
  favorites: parseFavorites,
};

/** Upgrades stored data from version `v` to `v + 1`. Keyed by the version it upgrades from. */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

/** Any untrusted value (stored JSON, a request body) -> valid preferences, field by field. */
export function parsePreferences(raw: unknown): Preferences {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ...DEFAULT_PREFERENCES };
  let data = raw as Record<string, unknown>;

  let version = typeof data.version === "number" ? data.version : PREFERENCES_VERSION;
  if (version > PREFERENCES_VERSION) return { ...DEFAULT_PREFERENCES }; // from a newer app: don't guess
  while (version < PREFERENCES_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) return { ...DEFAULT_PREFERENCES };
    data = migrate(data);
    version++;
  }

  const prefs = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(FIELD_PARSERS) as (keyof Preferences)[]) {
    const value = FIELD_PARSERS[key](data[key]);
    if (value !== undefined) (prefs as Record<keyof Preferences, unknown>)[key] = value;
  }
  return prefs;
}

/** The stored form: preferences plus the schema version. */
export function serializePreferences(prefs: Preferences): string {
  return JSON.stringify({ version: PREFERENCES_VERSION, ...prefs });
}
