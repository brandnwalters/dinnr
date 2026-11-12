"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toggleFavorite } from "@/lib/favorites";
import { addEntry } from "@/lib/meal-log";
import { useMealLog } from "@/lib/meal-log-store";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { hallQuery } from "../hall-columns";
import { MenuSkeleton } from "../menu-skeleton";
import { revealStation } from "../station-chips";
import { useTodayMenu } from "../today-menu-provider";
import { MenusScreen } from "./menus-screen";

/**
 * The Menus tab, filled from the shell's shared menu and the `?meal=` / `?hall=` URL state;
 * "I ate this" adds to the on-device meal log.
 * A deep link's station fragment (`menusHref`) is scrolled to once the menu is on screen.
 */
export function MenusView() {
  const menu = useTodayMenu();
  const [, updatePreferences] = usePreferences();
  const [, updateMealLog] = useMealLog();
  const searchParams = useSearchParams();
  useScrollToHashOnceShown(menu !== null);
  if (!menu) return <MenuSkeleton />;
  return (
    <MenusScreen
      halls={menu.halls}
      query={hallQuery(searchParams)}
      onToggleFavorite={(item) => updatePreferences((p) => ({ ...p, favorites: toggleFavorite(p.favorites, item) }))}
      onLogDish={(dish) => updateMealLog((log) => addEntry(log, dish, new Date()))}
      onClearFilters={() => updatePreferences(clearFilters)}
    />
  );
}

/**
 * Scrolls to the URL fragment's element once `shown` turns true, first
 * opening the bar or Extras it is collapsed in (`revealStation`). A deep link
 * opened fresh arrives before the menu has loaded (only skeletons on screen),
 * so the browser's own jump to the fragment finds nothing; this repeats it.
 */
function useScrollToHashOnceShown(shown: boolean) {
  useEffect(() => {
    if (!shown || window.location.hash.length < 2) return;
    revealStation(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }, [shown]);
}
