import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NutritionDetail } from "@/lib/nutrition-detail";
import { dietaryTagLabel } from "@/lib/dietary-tags";
import type { MenuItem } from "@/lib/today";
import { NutritionLabel } from "./nutrition-label";

/** Where the dish's nutrition fetch stands. */
export type NutritionLoad =
  | { state: "loading" }
  | { state: "loaded"; detail: NutritionDetail | null }
  | { state: "error" };

/**
 * The body of a dish's nutrition sheet: a star to favorite it, its diet tags
 * by full name (menu chips may abbreviate them), and its nutrition label.
 * Presentational, so it renders to static markup in tests; `NutritionSheet`
 * wraps it in the dialog and does the fetching.
 */
export function NutritionSheetContents({
  item,
  nutrition,
  onToggleFavorite,
}: {
  item: MenuItem;
  nutrition: NutritionLoad;
  /** Star / unstar the dish (by its normalized name). */
  onToggleFavorite?: (item: MenuItem) => void;
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
      {nutrition.state === "loading" && <p className="text-muted-foreground">Loading nutrition…</p>}
      {nutrition.state === "error" && <p>Couldn&apos;t load nutrition. Try again later.</p>}
      {nutrition.state === "loaded" && <NutritionLabel detail={nutrition.detail} />}
    </div>
  );
}
