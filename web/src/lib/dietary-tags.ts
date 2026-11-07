/**
 * Dietary tags: UNC's `prop-<code>` codes (saved by the scraper in
 * `menu_item.dietary_tags`) and their display labels, in the order UNC's own
 * legend lists them.
 */
export const DIETARY_TAGS = [
  { code: "vegan", label: "Vegan" },
  { code: "vegetarian", label: "Vegetarian" },
  { code: "halal", label: "Halal" },
  { code: "made_without_gluten", label: "Made Without Gluten" },
  { code: "smart_choice", label: "Smart Choice" },
  { code: "local", label: "Local" },
  { code: "organic", label: "Organic" },
  { code: "sustainable_seafood", label: "Sustainable Seafood" },
  { code: "cool_foods", label: "Coolfood" },
] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number]["code"];

const LABELS: Record<string, string> = Object.fromEntries(DIETARY_TAGS.map((t) => [t.code, t.label]));

export function isDietaryTag(code: unknown): code is DietaryTag {
  return typeof code === "string" && code in LABELS;
}

/** The display label for a tag code; an unknown (newly added by UNC) code is humanized. */
export function dietaryTagLabel(code: string): string {
  return LABELS[code] ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}
