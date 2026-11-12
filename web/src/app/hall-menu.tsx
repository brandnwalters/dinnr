import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { DietChips } from "./diet-chips";
import { FavoriteButton } from "./favorite-button";
import { NoMatchingItems } from "./menu-empty-states";
import { NutritionSheet } from "./nutrition-sheet";
import { stationAnchorId } from "@/lib/menus-link";
import { hours, statusText, statusTone, type StatusTone } from "@/lib/hall-status";
import { groupStations, stationPreview } from "@/lib/station-groups";
import type { Hall, MealPeriod, MenuItem, Station } from "@/lib/today";
import { cn } from "@/lib/utils";

/**
 * "140 cal" over "25 g protein", muted and right-aligned, leaving out whatever
 * the label doesn't give (and rendering nothing without nutrition).
 */
function MacroSummary({ item }: { item: MenuItem }) {
  const { calories, proteinG } = item.nutrition ?? {};
  const parts = [
    calories != null ? `${calories} cal` : null,
    proteinG != null ? `${proteinG} g protein` : null,
  ].filter((part) => part !== null);
  if (parts.length === 0) return null;
  return (
    <small className="flex shrink-0 flex-col text-right text-xs leading-tight text-muted-foreground tabular-nums">
      {parts.map((part) => (
        <span key={part}>{part}</span>
      ))}
    </small>
  );
}

/** The status theme tokens each status tone is drawn in. */
const STATUS_PILL_CLASS: Record<StatusTone, string> = {
  serving: "bg-status-serving text-status-serving-foreground",
  "opens-later": "bg-status-opens-later text-status-opens-later-foreground",
  closed: "bg-status-closed text-status-closed-foreground",
};

/** The hall's status (wording from `statusText`) as a pill colored by status. */
export function StatusPill({ hall }: { hall: Hall }) {
  return (
    <p
      data-status={hall.status}
      className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_PILL_CLASS[statusTone(hall)])}
    >
      {statusText(hall)}
    </p>
  );
}

/**
 * The hall's name (an h2 with id `headingId`) and status pill, e.g. "Open now:
 * Lunch until 2:30pm", styled like the hall cards on Today.
 */
export function HallMenuHeader({ hall, headingId }: { hall: Hall; headingId: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 id={headingId} className="text-lg font-semibold">
        {hall.name}
      </h2>
      <StatusPill hall={hall} />
    </div>
  );
}

/** A meal period's name and hours, e.g. "Lunch · 11am–2:30pm" (just the name without readable times). */
export function MealPeriodHeading({ mealPeriod }: { mealPeriod: MealPeriod }) {
  const time = hours(mealPeriod);
  return (
    <h3 className="text-sm font-medium">
      {mealPeriod.name}
      {time && ` · ${time}`}
    </h3>
  );
}

/**
 * One dish as a compact line (at least a tap target tall): the name (opens its
 * nutrition; wraps, never truncated), `children`, abbreviated diet chips, then
 * calories and protein right-aligned, and the star on the far right.
 * Favorites are tinted with the brand accent wherever they appear.
 */
function ItemRow({
  item,
  onToggleFavorite,
  children,
}: {
  item: MenuItem;
  onToggleFavorite?: (item: MenuItem) => void;
  children?: ReactNode;
}) {
  return (
    <li
      data-recipe={item.recipeId}
      data-favorite={item.favorite ? "true" : undefined}
      className={cn(
        "flex min-h-tap items-center gap-2 rounded-md border-b border-border/60 py-0.5 pl-2 last:border-b-0",
        item.favorite && "bg-brand/10",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-sm break-words">
        <NutritionSheet item={item} onToggleFavorite={onToggleFavorite} />
        {children}
        <DietChips tags={item.dietaryTags} />
      </div>
      <MacroSummary item={item} />
      <FavoriteButton item={item} onToggle={onToggleFavorite} />
    </li>
  );
}

/** "1 item", "42 items". */
function itemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

/** What every station on Menus is drawn from. */
type StationProps = {
  station: Station;
  /** See `MealPeriodMenu`. */
  anchorHall?: string;
  onToggleFavorite?: (item: MenuItem) => void;
};

/** `station`'s deep-link anchor id, when the menu has anchors (`anchorHall`). */
function anchorId(anchorHall: string | undefined, station: Station): string | undefined {
  return anchorHall ? stationAnchorId(anchorHall, station.name) : undefined;
}

/** A list of dishes, one `ItemRow` each. */
function ItemList({ items, onToggleFavorite }: { items: readonly MenuItem[]; onToggleFavorite?: (item: MenuItem) => void }) {
  return (
    <ul>
      {items.map((item) => (
        <ItemRow key={item.recipeId} item={item} onToggleFavorite={onToggleFavorite} />
      ))}
    </ul>
  );
}

/**
 * The tap target that expands a collapsed part of the menu: a native
 * `<summary>` (announced as expandable, with its state), `children`, and a
 * chevron that turns over while its `<details>` (which must have the `group`
 * class) is open.
 */
function ExpandSummary({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <summary
      className={cn(
        "flex min-h-tap cursor-pointer list-none items-center gap-2 rounded-md px-1 hover:bg-muted [&::-webkit-details-marker]:hidden",
        className,
      )}
    >
      <span className="flex-1">{children}</span>
      <ChevronDown
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
      />
    </summary>
  );
}

/**
 * A main station: its header pinned below the app header while its dishes
 * scroll, then its collapsed preview (`stationPreview`: a few dishes,
 * favorites first) and "Show all N", which opens the rest in place below.
 */
function MainStation({ station, anchorHall, onToggleFavorite }: StationProps) {
  const { shown, rest } = stationPreview(station);
  return (
    <section id={anchorId(anchorHall, station)} className="scroll-mt-app-header">
      <h4 className="sticky top-app-header z-1 bg-background py-2 font-semibold">{station.name}</h4>
      <ItemList items={shown} onToggleFavorite={onToggleFavorite} />
      {rest.length > 0 && (
        <details className="group">
          <ExpandSummary className="text-sm font-medium group-open:hidden">
            Show all {station.items.length}
            <span className="sr-only"> {station.name} dishes</span>
          </ExpandSummary>
          <ItemList items={rest} onToggleFavorite={onToggleFavorite} />
        </details>
      )}
    </section>
  );
}

/** A bar: one collapsed line, "Salad Bar · 42 items", that opens to all its dishes. */
function Bar({ station, anchorHall, onToggleFavorite }: StationProps) {
  return (
    <details id={anchorId(anchorHall, station)} className="group scroll-mt-app-header border-b border-border/60">
      <ExpandSummary>
        <strong className="font-semibold">{station.name}</strong>{" "}
        <span className="text-sm text-muted-foreground">· {itemCount(station.items.length)}</span>
      </ExpandSummary>
      <ItemList items={station.items} onToggleFavorite={onToggleFavorite} />
    </details>
  );
}

/** The one collapsed Extras section, "Extras · 60 items", that opens to each of its stations in full. */
function Extras({ stations, anchorHall, onToggleFavorite }: Omit<StationProps, "station"> & { stations: Station[] }) {
  const count = stations.reduce((total, station) => total + station.items.length, 0);
  return (
    <details className="group">
      <ExpandSummary>
        <strong className="font-semibold">Extras</strong>{" "}
        <span className="text-sm text-muted-foreground">· {itemCount(count)}</span>
      </ExpandSummary>
      {stations.map((station) => (
        <section key={station.name} id={anchorId(anchorHall, station)} className="scroll-mt-app-header">
          <h5 className="py-2 text-sm font-semibold">{station.name}</h5>
          <ItemList items={station.items} onToggleFavorite={onToggleFavorite} />
        </section>
      ))}
    </details>
  );
}

/**
 * One meal period's menu: its name and hours, the user's favorites first
 * ("Your favorites", each with its station), then its stations grouped
 * (`groupStations`): main stations in page order, each collapsed to a few
 * dishes plus "Show all N"; then the bars, each collapsed to one line; then
 * one collapsed Extras section. The collapsed parts are native `<details>`,
 * which the station chips open when they jump into one (`revealStation`).
 */
export function MealPeriodMenu({
  mealPeriod,
  anchorHall,
  onToggleFavorite,
  onClearFilters,
}: {
  mealPeriod: MealPeriod;
  /** Turn off the diet and allergen filters, offered when they hide every dish. */
  onClearFilters?: () => void;
  /**
   * The hall's slug, to give each station its deep-link anchor
   * (`stationAnchorId`). Only the Menus tab passes it, so hidden tabs kept
   * alive by navigation never hold a duplicate id.
   */
  anchorHall?: string;
  /** Star / unstar a dish (by its normalized name). */
  onToggleFavorite?: (item: MenuItem) => void;
}) {
  const { main, bars, extras } = groupStations(mealPeriod.stations);
  return (
    <section>
      <MealPeriodHeading mealPeriod={mealPeriod} />
      {main.length + bars.length + extras.length === 0 && <NoMatchingItems onClearFilters={onClearFilters} />}
      {mealPeriod.favorites.length > 0 && (
        <section>
          <h4 className="py-2 font-semibold">Your favorites</h4>
          <ul>
            {mealPeriod.favorites.map(({ station, item }) => (
              <ItemRow key={`${station}:${item.recipeId}`} item={item} onToggleFavorite={onToggleFavorite}>
                <small className="text-muted-foreground">· {station}</small>
              </ItemRow>
            ))}
          </ul>
        </section>
      )}
      {main.map((station) => (
        <MainStation key={station.name} station={station} anchorHall={anchorHall} onToggleFavorite={onToggleFavorite} />
      ))}
      {bars.map((station) => (
        <Bar key={station.name} station={station} anchorHall={anchorHall} onToggleFavorite={onToggleFavorite} />
      ))}
      {extras.length > 0 && <Extras stations={extras} anchorHall={anchorHall} onToggleFavorite={onToggleFavorite} />}
    </section>
  );
}
