"use client";

import { useMemo } from "react";
import {
  comboItemsFrom,
  MACROS,
  suggestCombos,
  type Combo,
  type Macro,
  type MacroRange,
  type MacroTargets,
} from "@/lib/combos";
import type { Hall } from "@/lib/today";

const LABELS: Record<Macro, { name: string; unit: string }> = {
  calories: { name: "Calories", unit: "cal" },
  proteinG: { name: "Protein", unit: "g protein" },
  carbsG: { name: "Carbs", unit: "g carbs" },
  fatG: { name: "Fat", unit: "g fat" },
};

/** Rounded for display: the engine adds labels' decimals (e.g. 2.5 g). */
const amount = (n: number) => String(Math.round(n * 10) / 10);

/** "≥ 30", "≤ 600", "50–90". */
function rangeText({ min, max }: MacroRange): string {
  if (min !== undefined && max !== undefined) return `${min}–${max}`;
  return min !== undefined ? `≥ ${min}` : `≤ ${max}`;
}

/** Min/max inputs per macro; an empty box clears that bound. */
function TargetsForm({ targets, onChange }: { targets: MacroTargets; onChange: (t: MacroTargets) => void }) {
  const set = (macro: Macro, bound: keyof MacroRange, text: string) => {
    const value = text.trim() === "" ? undefined : Number(text);
    if (value !== undefined && !(Number.isFinite(value) && value >= 0)) return;
    const range: MacroRange = { ...targets[macro], [bound]: value };
    if (range[bound] === undefined) delete range[bound];
    const next = { ...targets };
    if (range.min === undefined && range.max === undefined) delete next[macro];
    else next[macro] = range;
    onChange(next);
  };
  return (
    <fieldset>
      <legend>Macro targets for one meal (optional)</legend>
      {MACROS.map((macro) => (
        <div key={macro}>
          {LABELS[macro].name}{" "}
          {(["min", "max"] as const).map((bound) => (
            <label key={bound}>
              {bound}{" "}
              <input
                type="number"
                inputMode="decimal"
                min={0}
                name={`${macro}-${bound}`}
                value={targets[macro]?.[bound] ?? ""}
                onChange={(e) => set(macro, bound, e.target.value)}
                size={5}
              />{" "}
            </label>
          ))}
        </div>
      ))}
    </fieldset>
  );
}

function ComboTotals({ combo, targets }: { combo: Combo; targets: MacroTargets }) {
  return (
    <ul>
      {MACROS.map((macro) => (
        <li key={macro}>
          {amount(combo.totals[macro])} {LABELS[macro].unit}
          {targets[macro] && ` (target ${rangeText(targets[macro]!)})`}
        </li>
      ))}
    </ul>
  );
}

/** One hall's top combos from its selected meal period. */
function HallCombos({
  hall,
  targets,
  includeExcludedStations,
}: {
  hall: Hall;
  targets: MacroTargets;
  includeExcludedStations: boolean;
}) {
  const mealPeriod = hall.mealPeriods.find((mp) => mp.name === hall.selectedMealPeriod);
  // Pure and fast (< 1 s worst case for a real menu), so it runs here on every targets/menu change.
  const result = useMemo(
    () =>
      mealPeriod ? suggestCombos({ items: comboItemsFrom(mealPeriod), targets, includeExcludedStations }) : null,
    [mealPeriod, targets, includeExcludedStations],
  );
  return (
    <section aria-labelledby={`combos-${hall.slug}`}>
      <h3 id={`combos-${hall.slug}`}>
        {hall.name}
        {mealPeriod && ` · ${mealPeriod.name}`}
      </h3>
      {result === null ? (
        <p>No meal to build combos from.</p>
      ) : result.message ? (
        <p>{result.message}</p>
      ) : (
        <ol>
          {result.combos.map((combo) => (
            <li key={combo.items.map(({ item, servings }) => `${item.id}x${servings}`).join("+")}>
              {combo.items.map(({ item, servings }) => `${servings}× ${item.name}`).join(" + ")}
              <ComboTotals combo={combo} targets={targets} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * Macro combos: the targets form, the condiment-type stations toggle and, for
 * each hall, combos that meet the targets.
 */
export function MacroCombos({
  halls,
  targets,
  onTargetsChange,
  includeExcludedStations,
  onIncludeExcludedStationsChange,
}: {
  halls: Hall[];
  targets: MacroTargets;
  onTargetsChange: (targets: MacroTargets) => void;
  includeExcludedStations: boolean;
  onIncludeExcludedStationsChange: (include: boolean) => void;
}) {
  const anyTarget = Object.keys(targets).length > 0;
  return (
    <section aria-labelledby="macro-combos">
      <h2 id="macro-combos">Macro combos</h2>
      <TargetsForm targets={targets} onChange={onTargetsChange} />
      <label>
        <input
          type="checkbox"
          name="includeExcludedStations"
          checked={includeExcludedStations}
          onChange={(e) => onIncludeExcludedStationsChange(e.target.checked)}
        />{" "}
        Include condiments, beverages and cereal
      </label>
      {anyTarget ? (
        halls.map((hall) => <HallCombos
            key={hall.slug}
            hall={hall}
            targets={targets}
            includeExcludedStations={includeExcludedStations}
          />)
      ) : (
        <p>Set at least one target to see combos of up to 3 items from each hall.</p>
      )}
    </section>
  );
}
