import { mealPeriodNames, selectedMealPeriod } from "@/lib/meal-periods";
import type { Hall, MenuItem } from "@/lib/today";
import { cn } from "@/lib/utils";
import { HallMenuHeader, MealPeriodMenu } from "../hall-menu";
import { HallSwitcher, selectedHall } from "../hall-switcher";
import { MealPeriodSwitcher, NotServing } from "../meal-period-switcher";

/** The URL state of the Menus tab: `?meal=` (meal-period name) and `?hall=` (hall slug). */
export type MenusQuery = { meal?: string; hall?: string };

/**
 * The Menus tab: today's full menu for the meal period picked in the shared
 * meal-period switcher. Phones show one hall at a time, picked with the hall
 * switcher; from ~1024px up every hall gets a column and the hall switcher is
 * hidden. A hall that doesn't serve the selected meal period says so.
 * Presentational: the URL and the menu come in as props.
 */
export function MenusScreen({
  halls,
  query,
  onToggleFavorite,
}: {
  halls: readonly Hall[];
  query: MenusQuery;
  onToggleFavorite?: (item: MenuItem) => void;
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
              className={cn(h.slug !== hall && "hidden lg:block")}
            >
              <HallMenuHeader hall={h} headingId={`menus-hall-${h.slug}`} />
              {mealPeriod ? (
                <MealPeriodMenu mealPeriod={mealPeriod} onToggleFavorite={onToggleFavorite} />
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
