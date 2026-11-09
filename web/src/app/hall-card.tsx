import { Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { menusHref } from "@/lib/menus-link";
import { stationPreview } from "@/lib/station-preview";
import type { Hall, MealPeriod } from "@/lib/today";
import { HallMenuHeader, MealPeriodHeading } from "./hall-menu";
import { NotServing } from "./meal-period-switcher";
import { allDayEmptyState, NoMatchingItems } from "./menu-empty-states";

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
 * The condensed menu: one line per station, its name in bold, then its first
 * few dishes and "+N more" (`stationPreview`). Each line opens Menus at that
 * station for this hall and meal period.
 */
function StationPreviews({ hall, mealPeriod }: { hall: Hall; mealPeriod: MealPeriod }) {
  return (
    <ul aria-label={`${hall.name} stations`} className="flex flex-col">
      {mealPeriod.stations.map((station) => {
        const { names, more } = stationPreview(station);
        return (
          <li key={station.name}>
            <Link
              href={menusHref({ hall: hall.slug, meal: mealPeriod.name, station: station.name })}
              className="flex min-h-tap items-center rounded-md border-b border-border/60 px-1 py-1.5 text-sm hover:bg-muted"
            >
              <span>
                <strong className="font-semibold">{station.name}</strong>{" "}
                <span className="text-muted-foreground">{names.join(", ")}</span>
                {more > 0 && <span className="text-muted-foreground"> +{more} more</span>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One hall's card on Today for the meal period `meal` (from the shared
 * switcher): its name and status pill, then that meal period's hours, the
 * user's favorites served there, a condensed menu preview and a "See full
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
      <Card className="h-full gap-3">
        <CardHeader>
          <HallMenuHeader hall={hall} headingId={headingId} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <HallCardBody hall={hall} meal={meal} hasFavorites={hasFavorites} onClearFilters={onClearFilters} />
        </CardContent>
      </Card>
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
  return (
    <>
      <MealPeriodHeading mealPeriod={mealPeriod} />
      {mealPeriod.stations.length === 0 ? (
        <NoMatchingItems onClearFilters={onClearFilters} />
      ) : (
        <>
          <Favorites mealPeriod={mealPeriod} hasFavorites={hasFavorites} />
          <StationPreviews hall={hall} mealPeriod={mealPeriod} />
          <Button asChild variant="outline" className="min-h-tap w-full">
            <Link href={menusHref({ hall: hall.slug, meal: mealPeriod.name })}>See full menu</Link>
          </Button>
        </>
      )}
    </>
  );
}
