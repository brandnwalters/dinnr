import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MACROS, type Macro, type MacroRange, type MacroTargets } from "@/lib/combos";
import { MACRO_LABELS } from "./macro-labels";

/**
 * `targets` with one bound set from what was typed: an empty box clears it,
 * anything that isn't a non-negative number is ignored (null: no change).
 */
function withBound(targets: MacroTargets, macro: Macro, bound: keyof MacroRange, text: string): MacroTargets | null {
  const value = text.trim() === "" ? undefined : Number(text);
  if (value !== undefined && !(Number.isFinite(value) && value >= 0)) return null;
  const range: MacroRange = { ...targets[macro], [bound]: value };
  if (range[bound] === undefined) delete range[bound];
  const next = { ...targets };
  if (range.min === undefined && range.max === undefined) delete next[macro];
  else next[macro] = range;
  return next;
}

const BOUND_NAMES = { min: "Minimum", max: "Maximum" } as const;

/**
 * The compact targets card on the Macros tab: min and max boxes for calories,
 * protein, carbs and fat for the whole day (all optional), and the switch that lets
 * condiment, beverage and cereal stations into combos. Saving is the caller's
 * job (`onTargetsChange` and `onIncludeExcludedStationsChange`).
 */
export function TargetsCard({
  targets,
  onTargetsChange,
  includeExcludedStations,
  onIncludeExcludedStationsChange,
}: {
  targets: MacroTargets;
  onTargetsChange?: (targets: MacroTargets) => void;
  includeExcludedStations: boolean;
  onIncludeExcludedStationsChange?: (include: boolean) => void;
}) {
  const set = (macro: Macro, bound: keyof MacroRange, text: string) => {
    const next = withBound(targets, macro, bound, text);
    if (next) onTargetsChange?.(next);
  };
  return (
    <Card size="sm" className="md:max-w-xl">
      <CardHeader>
        <CardTitle>
          <h2>Daily targets</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-x-2 gap-y-1 text-sm">
          <span />
          <span aria-hidden className="text-xs text-muted-foreground">
            Min
          </span>
          <span aria-hidden className="text-xs text-muted-foreground">
            Max
          </span>
          {MACROS.map((macro) => (
            <MacroRow key={macro} macro={macro} range={targets[macro]} onChange={set} />
          ))}
        </div>
        <div className="flex min-h-tap items-center justify-between gap-3">
          <label htmlFor="include-excluded-stations" className="text-sm">
            Include condiments, beverages and cereal
          </label>
          <Switch
            id="include-excluded-stations"
            checked={includeExcludedStations}
            onCheckedChange={(checked) => onIncludeExcludedStationsChange?.(checked)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

/** One macro's label and its min and max boxes (three cells of the targets grid). */
function MacroRow({
  macro,
  range,
  onChange,
}: {
  macro: Macro;
  range: MacroRange | undefined;
  onChange: (macro: Macro, bound: keyof MacroRange, text: string) => void;
}) {
  const { name, unit } = MACRO_LABELS[macro];
  return (
    <>
      <span>
        {name} <span className="text-muted-foreground">({unit})</span>
      </span>
      {(["min", "max"] as const).map((bound) => (
        <Input
          key={bound}
          type="number"
          inputMode="decimal"
          min={0}
          name={`${macro}-${bound}`}
          aria-label={`${BOUND_NAMES[bound]} ${name.toLowerCase()} (${unit})`}
          value={range?.[bound] ?? ""}
          onChange={(e) => onChange(macro, bound, e.target.value)}
          className="min-h-tap"
        />
      ))}
    </>
  );
}
