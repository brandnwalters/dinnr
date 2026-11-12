import { MACROS, type Macro, type MacroRange, type MacroTargets } from "./combos";
import { MACRO_LABELS } from "./macro-labels";
import { entriesTotals, type LogEntry } from "./meal-log";

/**
 * Remaining targets: what's left of the daily macro targets once today's log
 * is counted, sized for the one suggestion the combos are for. Pure and
 * isomorphic; its output goes straight to `suggestCombos`, which is unchanged.
 */

/**
 * How combos are sized: `left` ("Fill what's left today") aims at all of
 * what's left; `per-meal` ("Per meal") at an even share of it per meal period
 * still to eat.
 */
export const TARGET_MODES = ["left", "per-meal"] as const;
export type TargetMode = (typeof TARGET_MODES)[number];

/**
 * The mode in use: `requested` (from `?mode=`) if it names one, else "Fill
 * what's left today" when anything is logged today and "Per meal" otherwise.
 */
export function targetMode(requested: string | null | undefined, todayEntries: readonly LogEntry[]): TargetMode {
  const chosen = TARGET_MODES.find((mode) => mode === requested);
  return chosen ?? (todayEntries.length > 0 ? "left" : "per-meal");
}

/** `targets` is null exactly when `message` explains why there's nothing to suggest. */
export type RemainingTargets = { targets: MacroTargets; message: null } | { targets: null; message: string };

export function remainingTargets({
  targets,
  todayEntries,
  mode,
  mealPeriods,
  selectedMeal,
}: {
  /** The daily targets. */
  targets: MacroTargets;
  /** Today's log entries (every hall and meal period). */
  todayEntries: readonly LogEntry[];
  mode: TargetMode;
  /** The meal periods the selected hall serves today. */
  mealPeriods: readonly string[];
  /** The meal period the combos are for. */
  selectedMeal: string;
}): RemainingTargets {
  const eaten = entriesTotals(todayEntries);
  // A max already reached: no combo can add to it (macros are never negative), so say so.
  const reached = MACROS.filter((m) => targets[m]?.max !== undefined && eaten[m] >= targets[m]!.max!);
  if (reached.length > 0) return { targets: null, message: reachedMessage(reached, targets) };
  const share = mode === "per-meal" ? mealsLeft(mealPeriods, selectedMeal, todayEntries) : 1;
  const out: MacroTargets = {};
  for (const macro of MACROS) {
    const range = targets[macro];
    if (!range) continue;
    const left: MacroRange = {};
    if (range.min !== undefined) left.min = Math.max(0, range.min - eaten[macro]) / share;
    if (range.max !== undefined) left.max = (range.max - eaten[macro]) / share;
    out[macro] = left;
  }
  return { targets: out, message: null };
}

/**
 * How many meal periods what's left is shared across: those in `mealPeriods`
 * with no entries today (at any hall), plus `selectedMeal` even if it has some.
 */
function mealsLeft(mealPeriods: readonly string[], selectedMeal: string, todayEntries: readonly LogEntry[]): number {
  const logged = new Set(todayEntries.map((e) => e.mealPeriod));
  const left = new Set(mealPeriods.filter((name) => !logged.has(name)));
  left.add(selectedMeal);
  return left.size;
}

/** "You've reached today's calorie and protein maximums (700 cal, 90 g), so there's nothing left to fill." */
function reachedMessage(reached: readonly Macro[], targets: MacroTargets): string {
  const names = reached.map((m) => MACRO_LABELS[m].modifier);
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const maxima = reached.map((m) => `${targets[m]!.max} ${MACRO_LABELS[m].unit}`).join(", ");
  const noun = reached.length === 1 ? "maximum" : "maximums";
  return `You've reached today's ${list} ${noun} (${maxima}), so there's nothing left to fill.`;
}
