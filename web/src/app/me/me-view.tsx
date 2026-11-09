"use client";

import { removeFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import { MeScreen, MeSkeleton } from "./me-screen";

/** Favorites and the theme live on the device, so the Me screen is filled in the browser. */
export function MeView() {
  const [preferences, updatePreferences] = usePreferences();
  if (!preferences) return <MeSkeleton />;
  return (
    <MeScreen
      favorites={preferences.favorites}
      onRemoveFavorite={(normalizedName) =>
        updatePreferences((p) => ({ ...p, favorites: removeFavorite(p.favorites, normalizedName) }))
      }
      theme={preferences.theme}
      onThemeChange={(theme) => updatePreferences((p) => ({ ...p, theme }))}
    />
  );
}
