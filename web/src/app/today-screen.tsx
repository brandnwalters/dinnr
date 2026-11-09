import { mealPeriodNames, selectedMealPeriod } from "@/lib/meal-periods";
import type { Hall } from "@/lib/today";
import { HallCard } from "./hall-card";
import { MealPeriodSwitcher } from "./meal-period-switcher";

/** The URL state of the Today tab: `?meal=` (meal-period name). */
export type TodayQuery = { meal?: string };

/**
 * The Today tab, a head-to-head to pick a hall in seconds: the shared
 * meal-period switcher, then one card per hall for that meal period (stacked
 * on phones and tablets, side by side from ~1024px up like Menus). Each card links into the
 * hall's full menu on Menus. Presentational: the URL and the menu come in as
 * props.
 */
export function TodayScreen({
  halls,
  query,
  hasFavorites,
  onClearFilters,
}: {
  halls: readonly Hall[];
  query: TodayQuery;
  /** Whether the user has starred any dish (else each card hints at starring). */
  hasFavorites: boolean;
  /** Turn off the diet and allergen filters (offered when they hide a whole meal period). */
  onClearFilters?: () => void;
}) {
  const meal = selectedMealPeriod(halls, query.meal);
  const links: Record<string, string> = query.meal ? { meal: query.meal } : {};
  return (
    <div className="flex flex-col gap-4">
      <MealPeriodSwitcher mealPeriods={mealPeriodNames(halls)} selected={meal} query={links} />
      <div className="grid grid-cols-1 gap-4 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {halls.map((hall) => (
          <HallCard
            key={hall.slug}
            hall={hall}
            meal={meal}
            hasFavorites={hasFavorites}
            onClearFilters={onClearFilters}
          />
        ))}
      </div>
    </div>
  );
}
