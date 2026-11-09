import { SearchX, Target } from "lucide-react";
import { useMemo } from "react";
import type { Allergen } from "@/lib/allergens";
import { comboItemsFrom, MAX_DISTINCT_ITEMS, suggestCombos, type MacroTargets } from "@/lib/combos";
import type { DietaryTag } from "@/lib/dietary-tags";
import { mealPeriodNames, selectedMealPeriod } from "@/lib/meal-periods";
import type { Hall, MealPeriod } from "@/lib/today";
import { cn } from "@/lib/utils";
import { AllergenDisclaimer } from "../allergen-disclaimer";
import { HallMenuHeader } from "../hall-menu";
import { HallSwitcher, selectedHall } from "../hall-switcher";
import { MealPeriodSwitcher, NotServing } from "../meal-period-switcher";
import { ComboCard } from "./combo-card";
import { EmptyState } from "./empty-state";
import { TargetsCard } from "./targets-card";

/** The URL state of the Combos tab: `?meal=` (meal-period name) and `?hall=` (hall slug). */
export type CombosQuery = { meal?: string; hall?: string };

/** The user's filters, applied by the engine (favorites come with the items). */
type ComboFilters = {
  includeExcludedStations: boolean;
  dietFilters: readonly DietaryTag[];
  allergens: readonly Allergen[];
};

/**
 * The Combos tab: the targets card, then each hall's top combos for the meal
 * period picked in the shared meal-period switcher. Like Menus, phones show
 * one hall at a time (hall switcher) and from ~1024px up every hall gets a
 * column. Combos respect the diet/allergen filters and favor favorites.
 * Presentational: the URL, the menu and the saved targets come in as props.
 */
export function CombosScreen({
  halls,
  query,
  targets,
  onTargetsChange,
  onIncludeExcludedStationsChange,
  ...filters
}: {
  halls: readonly Hall[];
  query: CombosQuery;
  targets: MacroTargets;
  onTargetsChange?: (targets: MacroTargets) => void;
  onIncludeExcludedStationsChange?: (include: boolean) => void;
} & ComboFilters) {
  const meal = selectedMealPeriod(halls, query.meal);
  const hall = selectedHall(halls, query.hall);
  const links = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
  return (
    <div className="flex flex-col gap-4">
      <TargetsCard
        targets={targets}
        onTargetsChange={onTargetsChange}
        includeExcludedStations={filters.includeExcludedStations}
        onIncludeExcludedStationsChange={onIncludeExcludedStationsChange}
      />
      <AllergenDisclaimer allergens={filters.allergens} />
      {Object.keys(targets).length === 0 ? (
        <EmptyState icon={Target} title="Set your targets">
          {`Set at least one target above to see combos of up to ${MAX_DISTINCT_ITEMS} items from each hall.`}
        </EmptyState>
      ) : (
        <>
          <MealPeriodSwitcher mealPeriods={mealPeriodNames(halls)} selected={meal} query={links} />
          <HallSwitcher halls={halls} selected={hall} query={links} className="lg:hidden" />
          <div className="grid grid-cols-1 gap-6 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
            {halls.map((h) => {
              const mealPeriod = h.mealPeriods.find((mp) => mp.name === meal);
              return (
                <section
                  key={h.slug}
                  aria-labelledby={`combos-hall-${h.slug}`}
                  className={cn("flex flex-col gap-3", h.slug !== hall && "hidden lg:flex")}
                >
                  <HallMenuHeader hall={h} headingId={`combos-hall-${h.slug}`} />
                  {mealPeriod ? (
                    <HallCombos mealPeriod={mealPeriod} targets={targets} {...filters} />
                  ) : (
                    meal && <NotServing mealPeriod={meal} />
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** One hall's top combos from one meal period. */
function HallCombos({ mealPeriod, targets, ...filters }: { mealPeriod: MealPeriod; targets: MacroTargets } & ComboFilters) {
  const { includeExcludedStations, dietFilters, allergens } = filters;
  // Pure and fast (< 1 s worst case for a real menu), so it runs here on every targets/menu change.
  const result = useMemo(
    () => suggestCombos({ items: comboItemsFrom(mealPeriod), targets, includeExcludedStations, dietFilters, allergens }),
    [mealPeriod, targets, includeExcludedStations, dietFilters, allergens],
  );
  if (result.message) {
    return (
      <EmptyState icon={SearchX} title="No combos for this meal">
        {result.message}
      </EmptyState>
    );
  }
  return (
    <ol className="flex flex-col gap-3">
      {result.combos.map((combo) => (
        <li key={combo.items.map(({ item, servings }) => `${item.id}x${servings}`).join("+")}>
          <ComboCard combo={combo} targets={targets} />
        </li>
      ))}
    </ol>
  );
}
