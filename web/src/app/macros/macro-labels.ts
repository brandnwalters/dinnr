import type { Macro } from "@/lib/combos";

/**
 * How the Combos tab names each macro: `name` for the targets card ("Protein"),
 * `unit` for its boxes ("g"), `total` for a combo's totals chips ("50 g protein").
 */
export const MACRO_LABELS: Record<Macro, { name: string; unit: string; total: string }> = {
  calories: { name: "Calories", unit: "cal", total: "cal" },
  proteinG: { name: "Protein", unit: "g", total: "g protein" },
  carbsG: { name: "Carbs", unit: "g", total: "g carbs" },
  fatG: { name: "Fat", unit: "g", total: "g fat" },
};
