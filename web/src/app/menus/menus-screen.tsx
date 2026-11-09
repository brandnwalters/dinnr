import { selectedMealPeriod } from "@/lib/meal-periods";
import type { Hall, MenuItem } from "@/lib/today";
import { HallColumns, HallSwitchers, type HallQuery } from "../hall-columns";
import { MealPeriodMenu } from "../hall-menu";
import { selectedHall } from "../hall-switcher";
import { NotServing } from "../meal-period-switcher";
import { allDayEmptyState } from "../menu-empty-states";
import { StationChips } from "../station-chips";

/**
 * The Menus tab: today's full menu for the meal period picked in the shared
 * meal-period switcher. Phones show one hall at a time, picked with the hall
 * switcher; from ~1024px up every hall gets a column and the hall switcher is
 * hidden. Each hall's column starts with a row of station chips that jump to
 * its stations (deep links from `menusHref`, so `?hall=&meal=#station` links
 * land on the same anchors). A hall that is closed all day, has no menu
 * posted yet, doesn't serve the selected meal period, or whose dishes the
 * filters all hide says so.
 * Presentational: the URL and the menu come in as props.
 */
export function MenusScreen({
  halls,
  query,
  onToggleFavorite,
  onClearFilters,
}: {
  halls: readonly Hall[];
  query: HallQuery;
  onToggleFavorite?: (item: MenuItem) => void;
  /** Turn off the diet and allergen filters (offered when they hide a whole meal period). */
  onClearFilters?: () => void;
}) {
  const meal = selectedMealPeriod(halls, query.meal);
  const hall = selectedHall(halls, query.hall);
  return (
    <div className="flex flex-col gap-4">
      <HallSwitchers halls={halls} query={query} meal={meal} hall={hall} />
      <HallColumns halls={halls} selected={hall} idPrefix="menus-hall">
        {(h) => {
          const mealPeriod = h.mealPeriods.find((mp) => mp.name === meal);
          return (
            allDayEmptyState(h) ??
            (mealPeriod ? (
              <>
                <StationChips hall={h} meal={mealPeriod.name} stations={mealPeriod.stations} />
                <MealPeriodMenu
                  mealPeriod={mealPeriod}
                  anchorHall={h.slug}
                  onToggleFavorite={onToggleFavorite}
                  onClearFilters={onClearFilters}
                />
              </>
            ) : (
              meal && <NotServing mealPeriod={meal} />
            ))
          );
        }}
      </HallColumns>
    </div>
  );
}
