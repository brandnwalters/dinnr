"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toggleFavorite } from "@/lib/favorites";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { MenuSkeleton } from "../menu-skeleton";
import { useTodayMenu } from "../today-menu-provider";
import { MenusScreen } from "./menus-screen";

/**
 * The Menus tab, filled from the shell's shared menu and the `?meal=` / `?hall=` URL state.
 * A deep link's station fragment (`menusHref`) is scrolled to once the menu is on screen.
 */
export function MenusView() {
  const menu = useTodayMenu();
  const [, updatePreferences] = usePreferences();
  const searchParams = useSearchParams();
  useScrollToHashOnceShown(menu !== null);
  if (!menu) return <MenuSkeleton />;
  return (
    <MenusScreen
      halls={menu.halls}
      query={{ meal: searchParams.get("meal") ?? undefined, hall: searchParams.get("hall") ?? undefined }}
      onToggleFavorite={(item) => updatePreferences((p) => ({ ...p, favorites: toggleFavorite(p.favorites, item) }))}
      onClearFilters={() => updatePreferences(clearFilters)}
    />
  );
}

/**
 * Scrolls to the URL fragment's element once `shown` turns true. A deep link
 * opened fresh arrives before the menu has loaded (only skeletons on screen),
 * so the browser's own jump to the fragment finds nothing; this repeats it.
 */
function useScrollToHashOnceShown(shown: boolean) {
  useEffect(() => {
    if (!shown || window.location.hash.length < 2) return;
    document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView();
  }, [shown]);
}
