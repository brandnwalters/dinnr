import { Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { menusHref } from "@/lib/menus-link";
import { newTodayDishes, PREVIEW_DISHES, TODAY_PREVIEW_LINES, todayPreview, type NewTodayServing } from "@/lib/station-groups";
import type { Hall, MealPeriod } from "@/lib/today";
import { HallMenuHeader, itemCount, MealPeriodHeading, StatusPill } from "./hall-menu";
import { NotServing } from "./meal-period-switcher";
import { allDayEmptyState, NoMatchingItems } from "./menu-empty-states";
import { UsualHoursButton, UsualHoursSheet } from "./usual-hours-sheet";

/**
 * "Your favorites here": the user's favorites in this meal period, each with
 * its station. A student with no favorites at all gets a hint to star dishes
 * instead; one whose favorites aren't served here sees nothing.
 */
function Favorites({ mealPeriod, hasFavorites }: { mealPeriod: MealPeriod; hasFavorites: boolean }) {
  if (!hasFavorites) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Star aria-hidden className="size-4 shrink-0" />
        Star dishes on Menus to see your favorites here.
      </p>
    );
  }
  if (mealPeriod.favorites.length === 0) return null;
  return (
    <section className="rounded-lg bg-brand/10 px-3 py-2">
      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
        <Star aria-hidden className="size-4 fill-brand text-brand" />
        Your favorites here
      </h4>
      <ul className="mt-1 flex flex-col gap-0.5 text-sm">
        {mealPeriod.favorites.map(({ station, item }) => (
          <li key={`${station}:${item.recipeId}`}>
            {item.name} <span className="text-muted-foreground">· {station}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "New today": the meal period's dishes this hall hasn't served lately (after
 * filters), each with its station: the first few, then "+N more". Counted as
 * one line of the card's preview; nothing when there are none.
 */
function NewToday({ hall, dishes }: { hall: Hall; dishes: NewTodayServing[] }) {
  if (dishes.length === 0) return null;
  const shown = dishes.slice(0, PREVIEW_DISHES);
  const more = dishes.length - shown.length;
  return (
    <section className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <h4 className="flex items-center gap-1.5 font-semibold">
        <Sparkles aria-hidden className="size-4 text-brand" />
        New today
      </h4>
      <ul aria-label={`New today at ${hall.name}`} className="contents">
        {shown.map(({ station, item }, i) => (
          <li key={item.normalizedName}>
            {item.name} <span className="text-muted-foreground">· {station}</span>
            {i < shown.length - 1 && <span aria-hidden>,</span>}
          </li>
        ))}
        {more > 0 && <li className="text-muted-foreground">+{more} more</li>}
      </ul>
    </section>
  );
}

/**
 * The condensed menu (`todayPreview`): up to about five lines, one per main
 * station with its name in bold, its first few dishes in page order and "+N
 * more", then each bar as "<Station> · N items"; Extras are left off. Each line
 * opens Menus at that station for this hall and meal period.
 */
function StationPreviews({ hall, mealPeriod, lines: maxLines }: { hall: Hall; mealPeriod: MealPeriod; lines: number }) {
  const lines = todayPreview(mealPeriod.stations, { lines: maxLines });
  if (lines.length === 0) return null;
  return (
    <ul aria-label={`${hall.name} stations`} className="flex flex-col">
      {lines.map((line) => (
        <li key={line.station.name}>
          <Link
            href={menusHref({ hall: hall.slug, meal: mealPeriod.name, station: line.station.name })}
            className="flex min-h-tap items-center rounded-md border-b border-border/60 px-1 py-1.5 text-sm hover:bg-muted"
          >
            <span>
              <strong className="font-semibold">{line.station.name}</strong>{" "}
              {line.kind === "bar" ? (
                <span className="text-muted-foreground">· {itemCount(line.count)}</span>
              ) : (
                <>
                  <span className="text-muted-foreground">{line.shown.map((item) => item.name).join(", ")}</span>
                  {line.more > 0 && <span className="text-muted-foreground"> +{line.more} more</span>}
                </>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * One hall's card on Today for the meal period `meal` (from the shared
 * switcher): its name and status pill, then that meal period's hours, the
 * user's favorites served there, its New today dishes, a condensed menu
 * preview (sharing the five-line cap with New today) and a "See full
 * menu" link into Menus. A hall that is closed all day, has no menu yet,
 * doesn't serve `meal` ("Not serving <meal>") or whose dishes the filters all
 * hide says so instead.
 */
export function HallCard({
  hall,
  meal,
  hasFavorites,
  onClearFilters,
}: {
  hall: Hall;
  meal: string | null;
  /** Whether the user has starred any dish (else the card hints at starring). */
  hasFavorites: boolean;
  /** Turn off the diet and allergen filters, offered when they hide every dish. */
  onClearFilters?: () => void;
}) {
  const headingId = `today-hall-${hall.slug}`;
  return (
    <section aria-labelledby={headingId}>
      <UsualHoursSheet hall={hall}>
        <Card className="h-full gap-3">
          <CardHeader>
            <HallMenuHeader
              hall={hall}
              headingId={headingId}
              status={
                <UsualHoursButton>
                  <StatusPill hall={hall} />
                </UsualHoursButton>
              }
            />
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <HallCardBody hall={hall} meal={meal} hasFavorites={hasFavorites} onClearFilters={onClearFilters} />
          </CardContent>
        </Card>
      </UsualHoursSheet>
    </section>
  );
}

/** What a hall card shows below its status pill (see `HallCard`). */
function HallCardBody({
  hall,
  meal,
  hasFavorites,
  onClearFilters,
}: {
  hall: Hall;
  meal: string | null;
  hasFavorites: boolean;
  onClearFilters?: () => void;
}) {
  const allDay = allDayEmptyState(hall);
  if (allDay) return allDay;
  const mealPeriod = hall.mealPeriods.find((mp) => mp.name === meal);
  if (!mealPeriod) return meal && <NotServing mealPeriod={meal} />;
  const newToday = newTodayDishes(mealPeriod.stations);
  return (
    <>
      <MealPeriodHeading mealPeriod={mealPeriod} renderLabel={(label) => <UsualHoursButton>{label}</UsualHoursButton>} />
      {mealPeriod.stations.length === 0 ? (
        <NoMatchingItems onClearFilters={onClearFilters} />
      ) : (
        <>
          <Favorites mealPeriod={mealPeriod} hasFavorites={hasFavorites} />
          <NewToday hall={hall} dishes={newToday} />
          <StationPreviews
            hall={hall}
            mealPeriod={mealPeriod}
            lines={TODAY_PREVIEW_LINES - (newToday.length > 0 ? 1 : 0)}
          />
          <Button asChild variant="outline" className="min-h-tap w-full">
            <Link href={menusHref({ hall: hall.slug, meal: mealPeriod.name })}>See full menu</Link>
          </Button>
        </>
      )}
    </>
  );
}
