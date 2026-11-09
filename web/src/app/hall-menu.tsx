import Link from "next/link";
import type { ReactNode } from "react";
import { DietaryTagBadges } from "./dietary-tag-badges";
import { FavoriteButton, FavoriteCount } from "./favorite-button";
import { NoMatchingItems } from "./menu-empty-states";
import { NutritionSheet } from "./nutrition-sheet";
import { stationAnchorId } from "@/lib/menus-link";
import type { Hall, MealPeriod, MenuItem } from "@/lib/today";

/** "140 cal · 25 g protein", leaving out whatever the label doesn't give. */
function MacroSummary({ item }: { item: MenuItem }) {
  const { calories, proteinG } = item.nutrition ?? {};
  const parts = [
    calories != null ? `${calories} cal` : null,
    proteinG != null ? `${proteinG} g protein` : null,
  ].filter((part) => part !== null);
  if (parts.length === 0) return null;
  return <small> {parts.join(" · ")}</small>;
}

/** "17:00" -> "5pm", "10:30" -> "10:30am". */
function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${h < 12 ? "am" : "pm"}`;
}

function hours(mealPeriod: MealPeriod): string | null {
  return mealPeriod.start && mealPeriod.end ? `${clock(mealPeriod.start)}–${clock(mealPeriod.end)}` : null;
}

/** The hall's name (an h2 with id `headingId`) and status line, e.g. "Open now: Lunch until 2:30pm". */
export function HallMenuHeader({ hall, headingId }: { hall: Hall; headingId: string }) {
  return (
    <>
      <h2 id={headingId}>{hall.name}</h2>
      <p data-status={hall.status}>{statusText(hall)}</p>
    </>
  );
}

function statusText(hall: Hall): string {
  const current = hall.mealPeriods.find((mp) => mp.name === hall.currentMealPeriod);
  switch (hall.status) {
    case "serving":
      return `Open now: ${current!.name} until ${clock(current!.end!)}`;
    case "opens-later":
      return `${current!.name} starts at ${clock(current!.start!)}`;
    case "done-for-today":
      return "Closed for the rest of today";
    case "closed-today":
      return "Closed today";
    case "no-menu":
      return "No menu for today yet";
  }
}

/** One dish in the list: star, name (opens its nutrition), `children`, badges and macros. */
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
    <li data-recipe={item.recipeId} data-favorite={item.favorite ? "true" : undefined}>
      <FavoriteButton item={item} onToggle={onToggleFavorite} />{" "}
      <NutritionSheet item={item} onToggleFavorite={onToggleFavorite} />
      {children}
      <DietaryTagBadges tags={item.dietaryTags} />
      <MacroSummary item={item} />
    </li>
  );
}

/**
 * One meal period's menu: its name and hours, the user's favorites first
 * ("Your favorites", each with its station), then every station in page order,
 * each station's header pinned below the app header while its dishes scroll.
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
  return (
    <section>
      <h3>
        {mealPeriod.name}
        {hours(mealPeriod) && ` · ${hours(mealPeriod)}`}
      </h3>
      {mealPeriod.stations.length === 0 && <NoMatchingItems onClearFilters={onClearFilters} />}
      {mealPeriod.favorites.length > 0 && (
        <section className="favorites-group">
          <h4>Your favorites</h4>
          <ul>
            {mealPeriod.favorites.map(({ station, item }) => (
              <ItemRow key={`${station}:${item.recipeId}`} item={item} onToggleFavorite={onToggleFavorite}>
                <small className="favorite-station"> · {station}</small>
              </ItemRow>
            ))}
          </ul>
        </section>
      )}
      {mealPeriod.stations.map((station) => (
        <section
          key={station.name}
          id={anchorHall ? stationAnchorId(anchorHall, station.name) : undefined}
          className="scroll-mt-app-header"
        >
          <h4 className="sticky top-app-header z-1 bg-background py-2 font-semibold">{station.name}</h4>
          <ul>
            {station.items.map((item) => (
              <ItemRow key={item.recipeId} item={item} onToggleFavorite={onToggleFavorite} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}

/**
 * One hall's status, a switcher for today's meal periods, and the selected
 * meal's menu (`MealPeriodMenu`).
 */
export function HallMenu({
  hall,
  onToggleFavorite,
}: {
  hall: Hall;
  /** Star / unstar a dish (by its normalized name). */
  onToggleFavorite?: (item: MenuItem) => void;
}) {
  const selected = hall.mealPeriods.find((mp) => mp.name === hall.selectedMealPeriod);
  return (
    <section aria-labelledby={`hall-${hall.slug}`}>
      <HallMenuHeader hall={hall} headingId={`hall-${hall.slug}`} />
      <FavoriteCount count={hall.favoriteCount} />

      {hall.mealPeriods.length > 0 && (
        <nav aria-label={`${hall.name} meal periods`}>
          <ul>
            {hall.mealPeriods.map((mp) => (
              <li key={mp.name}>
                <Link
                  href={{ query: { meal: mp.name } }}
                  aria-current={mp.name === hall.selectedMealPeriod ? "true" : undefined}
                >
                  {mp.name}
                  {hours(mp) && ` (${hours(mp)})`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {selected && <MealPeriodMenu mealPeriod={selected} onToggleFavorite={onToggleFavorite} />}
    </section>
  );
}
