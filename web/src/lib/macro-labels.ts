import type { Macro, MacroRange } from "./combos";

/**
 * How the app names each macro, the one place to change the wording: `name`
 * for the targets card and today's progress ("Protein"), `unit` for their
 * amounts ("g"), `total` for totals chips and day summaries ("50 g protein"),
 * and `modifier` inside a phrase ("today's calorie maximum").
 */
export const MACRO_LABELS: Record<Macro, { name: string; unit: string; total: string; modifier: string }> = {
  calories: { name: "Calories", unit: "cal", total: "cal", modifier: "calorie" },
  proteinG: { name: "Protein", unit: "g", total: "g protein", modifier: "protein" },
  carbsG: { name: "Carbs", unit: "g", total: "g carbs", modifier: "carb" },
  fatG: { name: "Fat", unit: "g", total: "g fat", modifier: "fat" },
};

/** Rounded for display to one decimal: totals add labels' decimals and half servings (e.g. 7.75 g). */
export const amount = (n: number) => String(Math.round(n * 10) / 10);

/** A target range as text, rounded like `amount` (a per-meal share can be 33.33…): "≥ 30", "≤ 600", "50–90". */
export function rangeText({ min, max }: MacroRange): string {
  if (min !== undefined && max !== undefined) return `${amount(min)}–${amount(max)}`;
  return min !== undefined ? `≥ ${amount(min)}` : `≤ ${amount(max!)}`;
}
