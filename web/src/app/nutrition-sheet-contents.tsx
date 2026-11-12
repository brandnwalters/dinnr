import { Check, Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { unloggableReason } from "@/lib/meal-log";
import type { NutritionDetail } from "@/lib/nutrition-detail";
import { dietaryTagLabel } from "@/lib/dietary-tags";
import type { MenuItem } from "@/lib/today";
import { LastServedLine } from "./last-served-line";
import { NutritionLabel } from "./nutrition-label";
import { ServingsStepper, servingsText } from "./servings-stepper";

/** Where the dish's nutrition fetch stands. */
export type NutritionLoad =
  | { state: "loading" }
  | { state: "loaded"; detail: NutritionDetail | null }
  | { state: "error" };

/**
 * The body of a dish's nutrition sheet: a star to favorite it, its diet tags
 * by full name (menu chips may abbreviate them), when it was last served,
 * "I ate this" with a servings stepper (when `onLog` is given), and its
 * nutrition label.
 * Presentational, so it renders to static markup in tests; `NutritionSheet`
 * wraps it in the dialog and does the fetching.
 */
export function NutritionSheetContents({
  item,
  nutrition,
  onToggleFavorite,
  onLog,
}: {
  item: MenuItem;
  nutrition: NutritionLoad;
  /** Star / unstar the dish (by its normalized name). */
  onToggleFavorite?: (item: MenuItem) => void;
  /** Log the dish to today's meal log (the caller knows its hall and meal period). */
  onLog?: (servings: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-tap"
          aria-pressed={item.favorite}
          aria-label={`${item.favorite ? "Unstar" : "Star"} ${item.name}`}
          onClick={onToggleFavorite && (() => onToggleFavorite(item))}
        >
          <Star aria-hidden className={item.favorite ? "fill-brand text-brand" : undefined} />
        </Button>
        {item.dietaryTags.length > 0 && (
          <ul aria-label="Dietary tags" className="flex flex-wrap gap-1.5 py-2">
            {item.dietaryTags.map((code) => (
              <li key={code} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {dietaryTagLabel(code)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <LastServedLine lastServed={item.lastServed} />
      {onLog && <LogDish item={item} onLog={onLog} />}
      {nutrition.state === "loading" && <p className="text-muted-foreground">Loading nutrition…</p>}
      {nutrition.state === "error" && <p>Couldn&apos;t load nutrition. Try again later.</p>}
      {nutrition.state === "loaded" && <NutritionLabel detail={nutrition.detail} />}
    </div>
  );
}

/**
 * "I ate this": a servings stepper (½ steps, from 1) and the button that logs
 * the dish, then confirms. Disabled, saying why, when the dish has no nutrition.
 */
function LogDish({ item, onLog }: { item: MenuItem; onLog: (servings: number) => void }) {
  const [servings, setServings] = useState(1);
  const [logged, setLogged] = useState<number | null>(null);
  const reason = unloggableReason(item);
  return (
    <section aria-label="Log this dish" className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ServingsStepper value={servings} onChange={reason ? undefined : setServings} />
        <Button
          type="button"
          className="min-h-tap px-4"
          disabled={reason !== null}
          aria-describedby={reason ? "log-dish-reason" : undefined}
          onClick={() => {
            onLog(servings);
            setLogged(servings);
          }}
        >
          I ate this
        </Button>
      </div>
      {reason && (
        <p id="log-dish-reason" className="text-xs text-muted-foreground">
          {reason}
        </p>
      )}
      <p aria-live="polite" className="text-xs text-muted-foreground empty:hidden">
        {logged !== null && (
          <>
            <Check aria-hidden className="inline size-3 text-brand" /> Logged {servingsText(logged)} to today on Macros.
          </>
        )}
      </p>
    </section>
  );
}
