import Link from "next/link";
import type { ReactNode } from "react";
import { DietaryTagBadges } from "./dietary-tag-badges";
import { FavoriteButton, FavoriteCount } from "./favorite-button";
import { NutritionSheet } from "./nutrition-sheet";
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
 * One hall's status, a switcher for today's meal periods, and the selected
 * meal's menu: the user's favorites first ("Your favorites", each with its
 * station), then every station in page order.
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
      <h2 id={`hall-${hall.slug}`}>{hall.name}</h2>
      <p data-status={hall.status}>{statusText(hall)}</p>
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

      {selected && (
        <section>
          <h3>
            {selected.name}
            {hours(selected) && ` · ${hours(selected)}`}
          </h3>
          {selected.stations.length === 0 && <p>No items match your filters.</p>}
          {selected.favorites.length > 0 && (
            <section className="favorites-group">
              <h4>Your favorites</h4>
              <ul>
                {selected.favorites.map(({ station, item }) => (
                  <ItemRow key={`${station}:${item.recipeId}`} item={item} onToggleFavorite={onToggleFavorite}>
                    <small className="favorite-station"> · {station}</small>
                  </ItemRow>
                ))}
              </ul>
            </section>
          )}
          {selected.stations.map((station) => (
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
      )}
    </section>
  );
}
