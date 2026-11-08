import type { MenuItem } from "@/lib/today";

/** A star toggle for one menu item. Favorites match by normalized name, so it stars the dish everywhere. */
export function FavoriteButton({ item, onToggle }: { item: MenuItem; onToggle?: (item: MenuItem) => void }) {
  return (
    <button
      type="button"
      className="favorite-button"
      aria-pressed={item.favorite}
      aria-label={`${item.favorite ? "Unstar" : "Star"} ${item.name}`}
      onClick={onToggle && (() => onToggle(item))}
    >
      {item.favorite ? "★" : "☆"}
    </button>
  );
}

/** "2 favorites this meal", or nothing when there are none. */
export function FavoriteCount({ count }: { count: number }) {
  if (count === 0) return null;
  return <p className="favorite-count">{`${count} favorite${count === 1 ? "" : "s"} this meal`}</p>;
}
