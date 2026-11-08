/**
 * Favorites: dishes the user has starred, kept in on-device preferences.
 *
 * A favorite is matched by **normalized name** (lowercased, trimmed, whitespace
 * collapsed), so a dish counts at any station or hall whatever its recipe id.
 * The scraper saves each item's normalized name (`menu_item.normalized_name`)
 * and the Today data layer returns it on every item; use that value, and
 * `normalizeName` only for input that didn't come from the database.
 */

/** A starred dish. `name` is how it was displayed when starred, for the manage page. */
export type FavoriteDish = { normalizedName: string; name: string };

/** The scraper's rule (`menu_parser.normalize_name`): lowercased, trimmed, whitespace collapsed. */
export function normalizeName(name: string): string {
  return name.trim().split(/\s+/).join(" ").toLowerCase();
}

/** Untrusted stored value -> favorites (bad entries dropped, one per normalized name), or undefined. */
export function parseFavorites(raw: unknown): FavoriteDish[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const byName = new Map<string, FavoriteDish>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const { normalizedName, name } = entry as Record<string, unknown>;
    if (typeof normalizedName !== "string" || typeof name !== "string") continue;
    const key = normalizeName(normalizedName);
    if (key !== "" && !byName.has(key)) byName.set(key, { normalizedName: key, name: name.trim() || key });
  }
  return [...byName.values()];
}

export function isFavorite(favorites: FavoriteDish[], normalizedName: string): boolean {
  return favorites.some((f) => f.normalizedName === normalizedName);
}

/** Star `dish` if it isn't a favorite yet, else unstar it. */
export function toggleFavorite(favorites: FavoriteDish[], dish: FavoriteDish): FavoriteDish[] {
  return isFavorite(favorites, dish.normalizedName)
    ? removeFavorite(favorites, dish.normalizedName)
    : [...favorites, { normalizedName: dish.normalizedName, name: dish.name }];
}

export function removeFavorite(favorites: FavoriteDish[], normalizedName: string): FavoriteDish[] {
  return favorites.filter((f) => f.normalizedName !== normalizedName);
}
