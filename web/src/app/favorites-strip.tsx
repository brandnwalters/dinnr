import { Star } from "lucide-react";
import { withSelectedMeal } from "@/lib/meal-periods";
import type { Hall } from "@/lib/today";

/**
 * The strip above Today's cards comparing the halls' favorites in the meal
 * period `meal`: "★ Chase has 3 of your favorites · Top of Lenoir has 1", the
 * halls in their page order (fixed, so the strip doesn't reshuffle as counts
 * change). Each count is the hall's `favoriteCount` for that
 * meal period (0 for a hall that doesn't serve it), from the menu as filtered.
 * Hidden when no hall serves a favorite.
 */
export function FavoritesStrip({ halls, meal }: { halls: readonly Hall[]; meal: string | null }) {
  const counts = halls.map((hall) => ({
    name: hall.name,
    count: hall.mealPeriods.some((mp) => mp.name === meal) ? withSelectedMeal(hall, meal).favoriteCount : 0,
  }));
  if (counts.every(({ count }) => count === 0)) return null;
  return (
    <p
      aria-label="Favorites by hall"
      className="flex items-center gap-1.5 rounded-lg bg-brand/10 px-3 py-2 text-sm"
    >
      <Star aria-hidden className="size-4 shrink-0 fill-brand text-brand" />
      <span>
        {counts.map(({ name, count }, i) => (
          <span key={name}>
            {i > 0 && " · "}
            <strong className="font-semibold">{name}</strong> has {count}
            {i === 0 && " of your favorites"}
          </span>
        ))}
      </span>
    </p>
  );
}
