"use client";

import { useSearchParams } from "next/navigation";
import { toggleFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import { MenuSkeleton } from "../menu-skeleton";
import { useTodayMenu } from "../today-menu-provider";
import { MenusScreen } from "./menus-screen";

/** The Menus tab, filled from the shell's shared menu and the `?meal=` / `?hall=` URL state. */
export function MenusView() {
  const menu = useTodayMenu();
  const [, updatePreferences] = usePreferences();
  const searchParams = useSearchParams();
  if (!menu) return <MenuSkeleton />;
  return (
    <MenusScreen
      halls={menu.halls}
      query={{ meal: searchParams.get("meal") ?? undefined, hall: searchParams.get("hall") ?? undefined }}
      onToggleFavorite={(item) => updatePreferences((p) => ({ ...p, favorites: toggleFavorite(p.favorites, item) }))}
    />
  );
}
