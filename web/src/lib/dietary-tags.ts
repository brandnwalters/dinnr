/**
 * Dietary tags: UNC's `prop-<code>` codes (saved by the scraper in
 * `menu_item.dietary_tags`), their display labels and the short, fixed
 * abbreviations the compact menu rows show, in the order UNC's own legend
 * lists them.
 */
export const DIETARY_TAGS = [
  { code: "vegan", label: "Vegan", abbreviation: "VG" },
  { code: "vegetarian", label: "Vegetarian", abbreviation: "V" },
  { code: "halal", label: "Halal", abbreviation: "H" },
  { code: "made_without_gluten", label: "Made Without Gluten", abbreviation: "GF" },
  { code: "smart_choice", label: "Smart Choice", abbreviation: "SC" },
  { code: "local", label: "Local", abbreviation: "L" },
  { code: "organic", label: "Organic", abbreviation: "O" },
  { code: "sustainable_seafood", label: "Sustainable Seafood", abbreviation: "SS" },
  { code: "cool_foods", label: "Coolfood", abbreviation: "CF" },
] as const;

export type DietaryTag = (typeof DIETARY_TAGS)[number]["code"];

const LABELS: Record<string, string> = Object.fromEntries(DIETARY_TAGS.map((t) => [t.code, t.label]));
const ABBREVIATIONS: Record<string, string> = Object.fromEntries(DIETARY_TAGS.map((t) => [t.code, t.abbreviation]));

export function isDietaryTag(code: unknown): code is DietaryTag {
  return typeof code === "string" && code in LABELS;
}

/** The display label for a tag code; an unknown (newly added by UNC) code is humanized. */
export function dietaryTagLabel(code: string): string {
  return LABELS[code] ?? code.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * The short chip text for a tag code, e.g. "VG" for vegan. An unknown code
 * (newly added by UNC) gets its words' initials ("plant_forward" -> "PF"), or
 * the first two letters of a single word ("kosher" -> "KO"), or "?" when it
 * has no letters at all. Chips carry the full label for screen readers.
 */
export function dietaryTagAbbreviation(code: string): string {
  if (Object.hasOwn(ABBREVIATIONS, code)) return ABBREVIATIONS[code];
  const words = code.split(/[^a-z0-9]+/i).filter(Boolean);
  if (words.length === 0) return "?";
  const short = words.length === 1 ? words[0].slice(0, 2) : words.map((word) => word[0]).join("");
  return short.toUpperCase();
}
