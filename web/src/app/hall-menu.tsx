import Link from "next/link";
import type { ReactNode } from "react";
import { DietChips } from "./diet-chips";
import { FavoriteButton, FavoriteCount } from "./favorite-button";
import { NutritionSheet } from "./nutrition-sheet";
import type { Hall, MealPeriod, MenuItem } from "@/lib/today";
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

/**
 * One meal period's menu: its name and hours, the user's favorites first
 * ("Your favorites", each with its station), then every station in page order.
 */
export function MealPeriodMenu({
  mealPeriod,
  onToggleFavorite,
}: {
  mealPeriod: MealPeriod;
  /** Star / unstar a dish (by its normalized name). */
  onToggleFavorite?: (item: MenuItem) => void;
}) {
  return (
    <section>
      <h3>
        {mealPeriod.name}
        {hours(mealPeriod) && ` · ${hours(mealPeriod)}`}
      </h3>
      {mealPeriod.stations.length === 0 && <p>No items match your filters.</p>}
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
        <section key={station.name}>
          <h4>{station.name}</h4>
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
