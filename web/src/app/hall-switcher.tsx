import type { Hall } from "@/lib/today";
import { SegmentedControl } from "./segmented-control";

/**
 * The phone hall switcher (Menus, Combos): a Top of Lenoir / Chase segmented
 * control setting `?hall=<slug>`. Pages show only the selected hall
 * (`selectedHall`) below ~1024px and hide this switcher from there up, where
 * every hall gets its own column.
 */
export function HallSwitcher({
  halls,
  selected,
  query,
  className,
}: {
  halls: readonly Pick<Hall, "slug" | "name">[];
  /** The selected hall's slug. */
  selected: string | null;
  /** The page's current query parameters (kept when switching). */
  query: Readonly<Record<string, string>>;
  className?: string;
}) {
  return (
    <SegmentedControl
      label="Dining hall"
      param="hall"
      segments={halls.map(({ slug, name }) => ({ value: slug, label: name }))}
      selected={selected}
      query={query}
      className={className}
    />
  );
}

/**
 * The hall `?hall=` names (by slug), else the first hall serving `meal` (the
 * selected meal period), else the first hall.
 */
export function selectedHall(
  halls: readonly Pick<Hall, "slug" | "mealPeriods">[],
  requested: string | null | undefined,
  meal: string | null,
): string | null {
  return (
    halls.find((hall) => hall.slug === requested)?.slug ??
    halls.find((hall) => hall.mealPeriods.some((mp) => mp.name === meal))?.slug ??
    halls[0]?.slug ??
    null
  );
}
