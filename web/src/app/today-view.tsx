"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toggleFavorite } from "@/lib/favorites";
import { usePreferences } from "@/lib/preferences-store";
import type { TodayMenu } from "@/lib/today";
import { loadToday } from "./actions";
import { AllergenDisclaimer } from "./allergen-disclaimer";
import { AllergenFilters } from "./allergen-filters";
import { DietFilters } from "./diet-filters";
import { HallMenu } from "./hall-menu";
import { MacroCombos } from "./macro-combos";
import styles from "./page.module.css";

/**
 * The home page body. Preferences live on the device, so the menus are loaded
 * from the browser (through `loadToday`) once they've been read, and again
 * whenever they or the selected meal (`?meal=Dinner`, set by each hall's meal
 * switcher) change. Nothing is shown before then, so filtered-out items never
 * flash on screen.
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const meal = useSearchParams().get("meal") ?? undefined; // switches every hall that serves it today
  const [today, setToday] = useState<TodayMenu | null>(null);

  useEffect(() => {
    if (!preferences) return;
    let current = true;
    loadToday(preferences, meal).then((menu) => {
      if (current) setToday(menu);
    });
    return () => {
      current = false;
    };
  }, [preferences, meal]);

  if (!preferences) return <p>Loading today&apos;s menus…</p>;
  return (
    <>
      <p>
        <Link href="/favorites">My favorites ({preferences.favorites.length})</Link>
      </p>
      <DietFilters
        selected={preferences.dietFilters}
        onChange={(dietFilters) => updatePreferences((p) => ({ ...p, dietFilters }))}
      />
      <AllergenFilters
        selected={preferences.allergens}
        onChange={(allergens) => updatePreferences((p) => ({ ...p, allergens }))}
      />
      <AllergenDisclaimer allergens={preferences.allergens} />
      {today === null ? (
        <p>Loading today&apos;s menus…</p>
      ) : (
        // One column per hall on desktop, stacked on narrow screens (page.module.css).
        <>
          <div className={styles.halls}>
            {today.halls.map((hall) => (
              <HallMenu
                key={hall.slug}
                hall={hall}
                onToggleFavorite={(item) =>
                  updatePreferences((p) => ({ ...p, favorites: toggleFavorite(p.favorites, item) }))
                }
              />
            ))}
          </div>
          <MacroCombos
            halls={today.halls}
            targets={preferences.macroTargets}
            onTargetsChange={(macroTargets) => updatePreferences((p) => ({ ...p, macroTargets }))}
            includeExcludedStations={preferences.includeExcludedStations}
            onIncludeExcludedStationsChange={(includeExcludedStations) =>
              updatePreferences((p) => ({ ...p, includeExcludedStations }))
            }
          />
        </>
      )}
    </>
  );
}
