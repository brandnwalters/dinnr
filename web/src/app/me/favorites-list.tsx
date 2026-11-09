import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FavoriteDish } from "@/lib/favorites";

/** The user's favorites, each with a star button that unstars it. */
export function FavoritesList({
  favorites,
  onRemove,
}: {
  favorites: FavoriteDish[];
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
          <span>{dish.name}</span>
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
