"use client";

import Link from "next/link";
import { menusHref, stationAnchorId } from "@/lib/menus-link";
import { groupStations } from "@/lib/station-groups";
import type { Station } from "@/lib/today";

/**
 * Opens every collapsed `<details>` around (or at) the element with id `id`,
 * so a jump to a station inside a collapsed bar or Extras lands on something
 * visible. Returns the element, if there is one.
 */
export function revealStation(id: string): HTMLElement | null {
  const element = document.getElementById(id);
  for (let details = element?.closest("details"); details; details = details.parentElement?.closest("details")) {
    details.open = true;
  }
  return element;
}

/**
 * A horizontally scrolling row of chips above one hall's menu on the Menus
 * tab, one per station in the menu's grouped order (`groupStations`), each a
 * deep link (`menusHref`) that jumps to that station's anchor in the hall's
 * column, first opening the bar or Extras it is collapsed in. Renders nothing
 * for a meal period with no stations.
 */
export function StationChips({
  hall,
  meal,
  stations,
}: {
  hall: { slug: string; name: string };
  /** The selected meal period's name. */
  meal: string;
  stations: readonly Station[];
}) {
  const { main, bars, extras } = groupStations(stations);
  const ordered = [...main, ...bars, ...extras];
  if (ordered.length === 0) return null;
  return (
    <nav aria-label={`${hall.name} stations`} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-2 py-1">
        {ordered.map(({ name }) => (
          <li key={name} className="shrink-0">
            <Link
              href={menusHref({ hall: hall.slug, meal, station: name })}
              onClick={() => revealStation(stationAnchorId(hall.slug, name))}
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
