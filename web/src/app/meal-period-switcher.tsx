import { SegmentedControl } from "./segmented-control";

/**
 * The shared meal-period switcher (Menus, Today, Combos): one option per meal
 * period served today in either hall (`mealPeriodNames`), setting `?meal=`,
 * which switches every hall that serves it. `selected` comes from
 * `selectedMealPeriod`. Renders nothing when no hall serves anything today.
 */
export function MealPeriodSwitcher({
  mealPeriods,
  selected,
  query,
}: {
  mealPeriods: readonly string[];
  selected: string | null;
  /** The page's current query parameters (kept when switching). */
  query: Readonly<Record<string, string>>;
}) {
  if (mealPeriods.length === 0) return null;
  return (
    <SegmentedControl
      label="Meal period"
      param="meal"
      segments={mealPeriods.map((name) => ({ value: name, label: name }))}
      selected={selected}
      query={query}
    />
  );
}

/** What a hall shows when it doesn't serve the selected meal period today. */
export function NotServing({ mealPeriod }: { mealPeriod: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">Not serving {mealPeriod}</p>;
}
