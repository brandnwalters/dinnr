import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MACROS, type Combo, type MacroRange, type MacroTargets } from "@/lib/combos";
import { cn } from "@/lib/utils";
import { amount, MACRO_LABELS, rangeText } from "./macro-labels";

/** Whether `total` meets a macro's target; false when that macro has none. */
function withinTarget(total: number, range: MacroRange | undefined): boolean {
  if (!range) return false;
  return (range.min === undefined || total >= range.min) && (range.max === undefined || total <= range.max);
}

/**
 * One suggested combo: its items with servings ("2× Grilled Chicken Breast")
 * and its calorie, protein, carb and fat totals as chips. A chip whose macro
 * has a target shows it ("50 g protein (target ≥ 30)"); one that meets it is
 * drawn in the accent and says "within target" to assistive tech.
 */
export function ComboCard({ combo, targets }: { combo: Combo; targets: MacroTargets }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <ul className="flex flex-col gap-1 font-medium">
          {combo.items.map(({ item, servings }) => (
            <li key={item.id}>
              {servings}× {item.name}
            </li>
          ))}
        </ul>
        <ul aria-label="Totals" className="flex flex-wrap gap-1.5">
          {MACROS.map((macro) => {
            const range = targets[macro];
            const within = withinTarget(combo.totals[macro], range);
            return (
              <li
                key={macro}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                  within ? "bg-brand/15 text-foreground ring-1 ring-brand" : "bg-muted text-muted-foreground",
                )}
              >
                {within && <Check aria-hidden className="size-3 text-brand" />}
                {amount(combo.totals[macro])} {MACRO_LABELS[macro].total}
                {range && (
                  <span>
                    {` (target ${rangeText(range)}`}
                    {within && <span className="sr-only">, within target</span>})
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
