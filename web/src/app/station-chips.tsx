import Link from "next/link";
import { menusHref } from "@/lib/menus-link";
import type { Station } from "@/lib/today";

/**
 * A horizontally scrolling row of chips above one hall's menu on the Menus
 * tab, one per station, each a deep link (`menusHref`) that jumps to that
 * station's anchor in the hall's column. Renders nothing for a meal period
 * with no stations.
 */
export function StationChips({
  hall,
  meal,
  stations,
}: {
  hall: { slug: string; name: string };
  /** The selected meal period's name. */
  meal: string;
  stations: readonly Pick<Station, "name">[];
}) {
  if (stations.length === 0) return null;
  return (
    <nav aria-label={`${hall.name} stations`} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-2 py-1">
        {stations.map(({ name }) => (
          <li key={name} className="shrink-0">
            <Link
              href={menusHref({ hall: hall.slug, meal, station: name })}
              className="flex min-h-tap items-center rounded-full border bg-background px-4 text-sm font-medium whitespace-nowrap hover:bg-muted"
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
