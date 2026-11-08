"use client";

import { removeFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import { FavoritesList } from "./favorites-list";

/** Favorites live on the device, so the list is read in the browser. */
export function ManageFavorites() {
  const [preferences, updatePreferences] = usePreferences();
  if (!preferences) return <p>Loading your favorites…</p>;
  return (
    <FavoritesList
      favorites={preferences.favorites}
      onRemove={(normalizedName) =>
        updatePreferences((p) => ({ ...p, favorites: removeFavorite(p.favorites, normalizedName) }))
      }
    />
  );
}
