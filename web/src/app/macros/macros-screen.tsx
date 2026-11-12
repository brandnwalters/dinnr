import { SearchX, Target } from "lucide-react";
import { useMemo } from "react";
import { comboItemsFrom, MAX_DISTINCT_ITEMS, suggestCombos, type MacroTargets } from "@/lib/combos";
import type { MealLog } from "@/lib/meal-log";
import { selectedMealPeriod } from "@/lib/meal-periods";
import type { Filters } from "@/lib/preferences";
import type { Hall, MealPeriod } from "@/lib/today";
import { AllergenDisclaimer } from "../allergen-disclaimer";
import { HallColumns, HallSwitchers, type HallQuery } from "../hall-columns";
import { selectedHall } from "../hall-switcher";
import { NotServing } from "../meal-period-switcher";
import { allDayEmptyState, EmptyState, NoMatchingItems } from "../menu-empty-states";
import { ComboCard } from "./combo-card";
import { PastDays, TodayEntries, TodayProgress, type EntryActions } from "./meal-log-section";
import { TargetsCard } from "./targets-card";

/**
 * The Macros tab, top to bottom: the shared meal-period switcher (and, on
 * phones, the hall switcher) like Today and Menus; today's progress against
 * the daily targets; today's log entries by meal period; the daily targets
 * card; each hall's top combos for the picked meal period; and the collapsed
 * "Past 7 days". Like Menus, phones show one hall's combos at a time and from
 * ~1024px up every hall gets a column. Combos respect the diet/allergen
 * `filters` and favor favorites. A hall that is closed all day, has no menu
 * yet, doesn't serve the meal period, or whose dishes the filters all hide
 * says so.
 * Presentational: the URL, the menu, the saved targets and the meal log
 * (with `today`, the dining day) come in as props.
 */
export function MacrosScreen({
  halls,
  query,
  targets,
  onTargetsChange,
  includeExcludedStations,
  onIncludeExcludedStationsChange,
  filters,
  onClearFilters,
  log,
  today,
  onChangeServings,
  onDeleteEntry,
}: {
  halls: readonly Hall[];
  query: HallQuery;
  /** The daily macro targets. */
  targets: MacroTargets;
  onTargetsChange?: (targets: MacroTargets) => void;
  /** Whether condiment-type stations may be part of combos. */
  includeExcludedStations: boolean;
  onIncludeExcludedStationsChange?: (include: boolean) => void;
  filters: Filters;
  /** Turn off the diet and allergen filters (offered when they hide a whole meal period). */
  onClearFilters?: () => void;
  log: MealLog;
  /** Today's dining day (YYYY-MM-DD, America/New_York). */
  today: string;
} & EntryActions) {
  const meal = selectedMealPeriod(halls, query.meal);
  const hall = selectedHall(halls, query.hall, meal);
  const entryActions = { onChangeServings, onDeleteEntry };
  return (
    <div className="flex flex-col gap-4">
      <HallSwitchers halls={halls} query={query} meal={meal} hall={hall} />
      <TodayProgress log={log} today={today} targets={targets} />
      <TodayEntries log={log} today={today} {...entryActions} />
      <TargetsCard
        targets={targets}
        onTargetsChange={onTargetsChange}
        includeExcludedStations={includeExcludedStations}
        onIncludeExcludedStationsChange={onIncludeExcludedStationsChange}
      />
      <AllergenDisclaimer allergens={filters.allergens} />
      {Object.keys(targets).length === 0 ? (
        <EmptyState
          icon={Target}
          title="Set your targets"
          description={`Set at least one target above to see combos of up to ${MAX_DISTINCT_ITEMS} items from each hall.`}
        />
      ) : (
        <HallColumns halls={halls} selected={hall} idPrefix="combos-hall">
          {(h) => {
            const allDay = allDayEmptyState(h);
            if (allDay) return allDay;
            const mealPeriod = h.mealPeriods.find((mp) => mp.name === meal);
            if (!mealPeriod) return meal && <NotServing mealPeriod={meal} />;
            if (mealPeriod.stations.length === 0) return <NoMatchingItems onClearFilters={onClearFilters} />;
            return (
              <HallCombos
                mealPeriod={mealPeriod}
                targets={targets}
                includeExcludedStations={includeExcludedStations}
                filters={filters}
              />
            );
          }}
        </HallColumns>
      )}
      <PastDays log={log} today={today} {...entryActions} />
    </div>
  );
}

/** One hall's top combos from one meal period. */
function HallCombos({
  mealPeriod,
  targets,
  includeExcludedStations,
  filters: { dietFilters, allergens },
}: {
  mealPeriod: MealPeriod;
  targets: MacroTargets;
  includeExcludedStations: boolean;
  filters: Filters;
}) {
  // Pure and fast (< 1 s worst case for a real menu), so it runs here on every targets/menu change.
  const result = useMemo(
    () => suggestCombos({ items: comboItemsFrom(mealPeriod), targets, includeExcludedStations, dietFilters, allergens }),
    [mealPeriod, targets, includeExcludedStations, dietFilters, allergens],
  );
  if (result.message) {
    return <EmptyState icon={SearchX} title="No combos for this meal" description={result.message} />;
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
