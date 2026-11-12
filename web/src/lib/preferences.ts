import { isAllergen, type Allergen } from "./allergens";
import { isDietaryTag, type DietaryTag } from "./dietary-tags";
import { parseMacroTargets, type MacroTargets } from "./combos";
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
 * needs no version bump. Bump `PREFERENCES_VERSION` only when an existing
 * field changes meaning or shape, and then add a migration step from the old
 * version in `parsePreferences` (stored data of any version it can't read
 * falls back to the defaults).
 */

export type Preferences = {
  /** Strict cutoffs: an item must carry every one of these tags to be shown. */
  dietFilters: DietaryTag[];
  /** Strict cutoffs: an item carrying any of these allergens is hidden. */
  allergens: Allergen[];
  /** Macros tab: optional daily min/max per macro (stored before targets became daily: kept as they are). */
  macroTargets: MacroTargets;
  /** Starred dishes, matched by normalized name at any station or hall (see `favorites.ts`). */
  favorites: FavoriteDish[];
  /** Macro combos: let items from condiment-type stations (flagged by the scraper) into combos. */
  includeExcludedStations: boolean;
  /** Appearance: follow the phone's light/dark setting, or force one. */
  theme: Theme;
};

/** The Appearance choices, in the order the Me tab shows them. */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return (THEMES as readonly unknown[]).includes(value);
}

export const PREFERENCES_VERSION = 1;

/**
 * The localStorage key the store (`preferences-store.ts`) saves under. Defined
 * here, free of React, so the pre-paint theme script (`theme.ts`) can read it too.
 */
export const PREFERENCES_STORAGE_KEY = "dinnr:preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  dietFilters: [],
  allergens: [],
  macroTargets: {},
  favorites: [],
  includeExcludedStations: false,
  theme: "system",
};

type FieldParsers = { [K in keyof Preferences]: (raw: unknown) => Preferences[K] | undefined };

const FIELD_PARSERS: FieldParsers = {
  dietFilters: (raw) => (Array.isArray(raw) ? [...new Set(raw.filter(isDietaryTag))] : undefined),
  allergens: (raw) => (Array.isArray(raw) ? [...new Set(raw.filter(isAllergen))] : undefined),
  macroTargets: parseMacroTargets,
  favorites: parseFavorites,
  includeExcludedStations: (raw) => (typeof raw === "boolean" ? raw : undefined),
  theme: (raw) => (isTheme(raw) ? raw : undefined),
};

/** Any untrusted value (stored JSON, a request body) -> valid preferences, field by field. */
export function parsePreferences(raw: unknown): Preferences {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ...DEFAULT_PREFERENCES };
  const data = raw as Record<string, unknown>;

  // Unversioned data (e.g. a request body) is read as current. Any other version, older or
  // from a newer app, is one we can't read: don't guess.
  const version = typeof data.version === "number" ? data.version : PREFERENCES_VERSION;
  if (version !== PREFERENCES_VERSION) return { ...DEFAULT_PREFERENCES };

  const prefs = { ...DEFAULT_PREFERENCES };
  for (const key of Object.keys(FIELD_PARSERS) as (keyof Preferences)[]) {
    const value = FIELD_PARSERS[key](data[key]);
    if (value !== undefined) (prefs as Record<keyof Preferences, unknown>)[key] = value;
  }
  return prefs;
}

/**
 * The preferences the Today data layer (`getToday`) reads: when only other
 * fields change (macro targets, the combo station toggle), the menus needn't
 * be reloaded. Add a field here if `getToday` starts reading it.
 */
export function todayQueryPreferences({
  dietFilters,
  allergens,
  favorites,
}: Preferences): Pick<Preferences, "dietFilters" | "allergens" | "favorites"> {
  return { dietFilters, allergens, favorites };
}

/** The diet and allergen filters, which travel together (filter sheet, filter button, combos). */
export type Filters = Pick<Preferences, "dietFilters" | "allergens">;

/** "Clear filters": `prefs` with the diet and allergen filters turned off, everything else kept. */
export function clearFilters(prefs: Preferences): Preferences {
  const none: Filters = { dietFilters: [], allergens: [] };
  return { ...prefs, ...none };
}

/** The stored form: preferences plus the schema version. */
export function serializePreferences(prefs: Preferences): string {
  return JSON.stringify({ version: PREFERENCES_VERSION, ...prefs });
}
