import type { FavoriteDish } from "@/lib/favorites";

/** The user's favorites, each removable. */
export function FavoritesList({
  favorites,
  onRemove,
}: {
  favorites: FavoriteDish[];
  onRemove?: (normalizedName: string) => void;
}) {
  if (favorites.length === 0) {
    return <p>No favorites yet. Tap the ☆ next to any dish on today&apos;s menus to add one.</p>;
  }
  return (
    <ul>
      {favorites.map((dish) => (
        <li key={dish.normalizedName}>
          {dish.name}{" "}
          <button
            type="button"
            aria-label={`Remove ${dish.name}`}
            onClick={onRemove && (() => onRemove(dish.normalizedName))}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
