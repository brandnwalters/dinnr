import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FavoriteDish } from "@/lib/favorites";
import type { LastServed } from "@/lib/served-history";
import { LastServedLine } from "../last-served-line";
import { Bone } from "../menu-skeleton";

/**
 * The user's favorites, each with when it was last served (if known, or a
 * placeholder line while that's loading) and a star button that unstars it.
 */
export function FavoritesList({
  favorites,
  lastServed,
  onRemove,
}: {
  favorites: FavoriteDish[];
  /** By normalized name; a favorite with no entry gets no line. Absent while today's menus load. */
  lastServed?: Record<string, LastServed>;
  onRemove?: (normalizedName: string) => void;
}) {
  if (favorites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No favorites yet. Tap the star next to any dish on today&apos;s menus to add one.
      </p>
    );
  }
  return (
    <ul className="divide-y">
      {favorites.map((dish) => (
        <li key={dish.normalizedName} className="flex min-h-tap items-center justify-between gap-2">
          <div className="flex flex-col py-2">
            <span>{dish.name}</span>
            {lastServed ? (
              <LastServedLine lastServed={lastServed[dish.normalizedName]} />
            ) : (
              <Bone className="my-0.5 h-4 w-56 max-w-full" />
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-tap"
            aria-label={`Unstar ${dish.name}`}
            onClick={onRemove && (() => onRemove(dish.normalizedName))}
          >
            <Star aria-hidden className="fill-brand text-brand" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
