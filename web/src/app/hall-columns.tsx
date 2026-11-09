import type { ReactNode } from "react";
import { mealPeriodNames } from "@/lib/meal-periods";
import type { Hall } from "@/lib/today";
import { cn } from "@/lib/utils";
import { HallMenuHeader } from "./hall-menu";
import { HallSwitcher } from "./hall-switcher";
import { MealPeriodSwitcher } from "./meal-period-switcher";

/**
 * The layout Menus and Combos share: the meal-period and hall switchers, and
 * one column per hall (phones show only the selected hall; from ~1024px up
 * every hall gets a column and the hall switcher is hidden). Presentational.
 */

/** The URL state of Menus and Combos: `?meal=` (meal-period name) and `?hall=` (hall slug). */
export type HallQuery = { meal?: string; hall?: string };

/** `?meal=` and `?hall=` read from the URL's search params (absent ones left out). */
export function hallQuery(params: { get(name: string): string | null }): HallQuery {
  return { meal: params.get("meal") ?? undefined, hall: params.get("hall") ?? undefined };
}

/** The grid that puts halls side by side from ~1024px up (also used by Today and the skeleton). */
export const HALL_GRID_CLASS = "grid grid-cols-1 gap-6 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none";

/**
 * The meal-period switcher (selected: `meal`) and, on phones, the hall
 * switcher (selected: `hall`); their links keep the rest of `query`.
 */
export function HallSwitchers({
  halls,
  query,
  meal,
  hall,
}: {
  halls: readonly Hall[];
  query: HallQuery;
  meal: string | null;
  hall: string | null;
}) {
  const links = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined));
  return (
    <>
      <MealPeriodSwitcher mealPeriods={mealPeriodNames(halls)} selected={meal} query={links} />
      <HallSwitcher halls={halls} selected={hall} query={links} className="lg:hidden" />
    </>
  );
}

/**
 * One column per hall, each headed by its name and status pill
 * (`HallMenuHeader`, heading id `<idPrefix>-<slug>`) with `children(hall)`
 * below. Only the `selected` hall shows on phones.
 */
export function HallColumns({
  halls,
  selected,
  idPrefix,
  children,
}: {
  halls: readonly Hall[];
  selected: string | null;
  idPrefix: string;
  children: (hall: Hall) => ReactNode;
}) {
  return (
    <div className={HALL_GRID_CLASS}>
      {halls.map((hall) => {
        const headingId = `${idPrefix}-${hall.slug}`;
        return (
          <section
            key={hall.slug}
            aria-labelledby={headingId}
            className={cn("flex flex-col gap-3", hall.slug !== selected && "hidden lg:flex")}
          >
            <HallMenuHeader hall={hall} headingId={headingId} />
            {children(hall)}
          </section>
        );
      })}
    </div>
  );
}
