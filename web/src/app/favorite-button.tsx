import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/today";

/** A star toggle (~44px tap target) for one menu item. Favorites match by normalized name, so it stars the dish everywhere. */
export function FavoriteButton({ item, onToggle }: { item: MenuItem; onToggle?: (item: MenuItem) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-tap"
      aria-pressed={item.favorite}
      aria-label={`${item.favorite ? "Unstar" : "Star"} ${item.name}`}
      onClick={onToggle && (() => onToggle(item))}
    >
      <Star aria-hidden className={item.favorite ? "fill-brand text-brand" : "text-muted-foreground"} />
    </Button>
  );
}

/** "2 favorites this meal", or nothing when there are none. */
export function FavoriteCount({ count }: { count: number }) {
  if (count === 0) return null;
  return <p className="favorite-count">{`${count} favorite${count === 1 ? "" : "s"} this meal`}</p>;
}
