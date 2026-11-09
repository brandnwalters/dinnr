"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { todayQueryPreferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import type { TodayMenu } from "@/lib/today";
import { loadToday } from "./actions";

const TodayMenuContext = createContext<TodayMenu | null>(null);

/**
 * Loads today's menus once for the whole app shell, so every tab (Today,
 * Menus, Combos) shares them and switching tabs doesn't refetch. Preferences
 * live on the device: they're read first, then the menus load through
 * `loadToday`, again only when a preference the server query reads
 * (`todayQueryPreferences`: filters, favorites) changes. The meal period is
 * chosen in the browser (`withSelectedMeal`, `selectedMealPeriod`), so
 * switching it needs no reload either. Mounted in the root layout, which stays
 * mounted across navigations.
 */
export function TodayMenuProvider({ children }: { children: React.ReactNode }) {
  const [preferences] = usePreferences();
  const [menu, setMenu] = useState<TodayMenu | null>(null);

  // Only the fields the server query reads trigger a reload (not e.g. typing macro targets).
  const queryKey = preferences ? JSON.stringify(todayQueryPreferences(preferences)) : null;
  useEffect(() => {
    if (queryKey === null) return;
    let current = true;
    loadToday(JSON.parse(queryKey)).then((loaded) => {
      if (current) setMenu(loaded);
    });
    return () => {
      current = false;
    };
  }, [queryKey]);

  // Nothing before preferences are read, so filtered-out items never flash on screen.
  return <TodayMenuContext.Provider value={queryKey === null ? null : menu}>{children}</TodayMenuContext.Provider>;
}

/**
 * Today's menus, filtered by the device's preferences; null while preferences
 * are read and the first load is in flight (show skeletons). Halls carry the
 * server's default selection: apply `?meal=` with `withSelectedMeal`.
 */
export function useTodayMenu(): TodayMenu | null {
  return useContext(TodayMenuContext);
}
