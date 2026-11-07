/**
 * Allergens: UNC's `allergen-has_<code>` codes (saved by the scraper, without
 * the `has_` prefix, in `menu_item.allergens`) and their display labels, in the
 * order UNC's own allergen filter lists them.
 *
 * Filtering relies on UNC's labels only, and cross-contact is possible: never
 * present it as a guarantee (see `AllergenDisclaimer`).
 */
export const ALLERGENS = [
  { code: "egg", label: "Egg" },
  { code: "soy", label: "Soy" },
  { code: "wheat", label: "Wheat" },
  { code: "milk", label: "Milk" },
  { code: "fish", label: "Fish" },
  { code: "shellfish", label: "Shellfish" },
  { code: "peanut", label: "Peanut" },
  { code: "tree_nuts", label: "Tree Nuts" },
  { code: "sesame", label: "Sesame" },
  { code: "gluten", label: "Gluten" },
] as const;

export type Allergen = (typeof ALLERGENS)[number]["code"];

const CODES: ReadonlySet<string> = new Set(ALLERGENS.map((a) => a.code));

export function isAllergen(code: unknown): code is Allergen {
  return typeof code === "string" && CODES.has(code);
}
