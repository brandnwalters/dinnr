"use client";

import { removeFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import { useTodayMenu } from "../today-menu-provider";
import { MeScreen, MeSkeleton } from "./me-screen";

/**
 * Favorites and the theme live on the device, so the Me screen is filled in
 * the browser. Each favorite's last served comes with today's shared menus,
 * which may load after the preferences.
 */
export function MeView() {
  const [preferences, updatePreferences] = usePreferences();
  const menu = useTodayMenu();
  if (!preferences) return <MeSkeleton />;
  return (
    <MeScreen
      favorites={preferences.favorites}
      favoritesLastServed={menu?.favoritesLastServed}
      onRemoveFavorite={(normalizedName) =>
        updatePreferences((p) => ({ ...p, favorites: removeFavorite(p.favorites, normalizedName) }))
      }
      theme={preferences.theme}
      onThemeChange={(theme) => updatePreferences((p) => ({ ...p, theme }))}
    />
  );
}
