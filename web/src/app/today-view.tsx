"use client";

import { useSearchParams } from "next/navigation";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { MenuSkeleton } from "./menu-skeleton";
import { useTodayMenu } from "./today-menu-provider";
import { TodayScreen } from "./today-screen";

/**
 * The Today tab, filled from the menus the app shell loaded (`useTodayMenu`),
 * the `?meal=` URL state and the favorites saved on the device. Skeletons show
 * until preferences are read and the menus have loaded, so filtered-out items
 * never flash on screen. Diet and allergen filters are set in the header's
 * filter sheet (`FilterSheet`).
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const meal = useSearchParams().get("meal") ?? undefined;
  const today = useTodayMenu();

  if (!preferences || !today) return <MenuSkeleton />;
  return (
    <TodayScreen
      halls={today.halls}
      query={{ meal }}
      hasFavorites={preferences.favorites.length > 0}
      onClearFilters={() => updatePreferences(clearFilters)}
    />
  );
}
