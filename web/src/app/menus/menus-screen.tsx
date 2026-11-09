import { mealPeriodNames, selectedMealPeriod } from "@/lib/meal-periods";
import type { Hall, MenuItem } from "@/lib/today";
import { cn } from "@/lib/utils";
import { HallMenuHeader, MealPeriodMenu } from "../hall-menu";
import { HallSwitcher, selectedHall } from "../hall-switcher";
import { AllDayEmptyState } from "../menu-empty-states";
import { MealPeriodSwitcher, NotServing } from "../meal-period-switcher";
import { StationChips } from "../station-chips";

/** The URL state of the Menus tab: `?meal=` (meal-period name) and `?hall=` (hall slug). */
export type MenusQuery = { meal?: string; hall?: string };

/**
 * The Menus tab: today's full menu for the meal period picked in the shared
 * meal-period switcher. Phones show one hall at a time, picked with the hall
 * switcher; from ~1024px up every hall gets a column and the hall switcher is
 * hidden. Each hall's column starts with a row of station chips that jump to
 * its stations (deep links from `menusHref`, so `?hall=&meal=#station` links
 * land on the same anchors). A hall that doesn't serve the selected meal
 * period, has no menu posted yet, or whose dishes the filters all hide says so.
 * Presentational: the URL and the menu come in as props.
 */
export function MenusScreen({
  halls,
  query,
  onToggleFavorite,
  onClearFilters,
}: {
  halls: readonly Hall[];
  query: MenusQuery;
  onToggleFavorite?: (item: MenuItem) => void;
  /** Turn off the diet and allergen filters (offered when they hide a whole meal period). */
  onClearFilters?: () => void;
}) {
  const meal = selectedMealPeriod(halls, query.meal);
  const hall = selectedHall(halls, query.hall);
  const links = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
  return (
    <div className="flex flex-col gap-4">
      <MealPeriodSwitcher mealPeriods={mealPeriodNames(halls)} selected={meal} query={links} />
      <HallSwitcher halls={halls} selected={hall} query={links} className="lg:hidden" />
      <div className="grid grid-cols-1 gap-6 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {halls.map((h) => {
          const mealPeriod = h.mealPeriods.find((mp) => mp.name === meal);
          return (
            <section
              key={h.slug}
              aria-labelledby={`menus-hall-${h.slug}`}
              className={cn("flex flex-col gap-3", h.slug !== hall && "hidden lg:flex")}
            >
              <HallMenuHeader hall={h} headingId={`menus-hall-${h.slug}`} />
              {h.status === "no-menu" || h.status === "closed-today" ? (
                <AllDayEmptyState hall={h} />
              ) : mealPeriod ? (
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
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
