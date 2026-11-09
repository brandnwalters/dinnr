"use client";

import { removeFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import { MeScreen } from "./me-screen";

/** Favorites live on the device, so the Me screen is filled in the browser. */
export function MeView() {
  const [preferences, updatePreferences] = usePreferences();
  if (!preferences) return <p className="text-sm text-muted-foreground">Loading your favorites…</p>;
  return (
    <MeScreen
      favorites={preferences.favorites}
      onRemoveFavorite={(normalizedName) =>
        updatePreferences((p) => ({ ...p, favorites: removeFavorite(p.favorites, normalizedName) }))
      }
    />
  );
}
