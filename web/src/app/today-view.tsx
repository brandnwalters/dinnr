"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toggleFavorite } from "@/lib/favorites";
import { todayQueryPreferences } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import type { TodayMenu } from "@/lib/today";
import { loadToday } from "./actions";
import { HallMenu } from "./hall-menu";
import { MacroCombos } from "./macro-combos";

/**
 * The home page body. Preferences live on the device, so the menus are loaded
 * from the browser (through `loadToday`) once they've been read, and again
 * whenever the selected meal (`?meal=Dinner`, set by each hall's meal
 * switcher) or a preference the server query reads (`todayQueryPreferences`:
 * filters, favorites) changes. Nothing is shown before then, so filtered-out items never
 * flash on screen. Diet and allergen filters are set in the header's filter
 * sheet (`FilterSheet`).
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const meal = useSearchParams().get("meal") ?? undefined; // switches every hall that serves it today
  const [today, setToday] = useState<TodayMenu | null>(null);

  // Only the fields the server query reads trigger a reload (not e.g. typing macro targets).
  const queryKey = preferences ? JSON.stringify(todayQueryPreferences(preferences)) : null;
  useEffect(() => {
    if (queryKey === null) return;
    let current = true;
    loadToday(JSON.parse(queryKey), meal).then((menu) => {
      if (current) setToday(menu);
    });
    return () => {
      current = false;
    };
  }, [queryKey, meal]);

  if (!preferences) return <p>Loading today&apos;s menus…</p>;
  return (
    <>
      {today === null ? (
        <p>Loading today&apos;s menus…</p>
      ) : (
        // One column per hall from tablet width up, stacked on narrow screens.
        <>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
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
            dietFilters={preferences.dietFilters}
            allergens={preferences.allergens}
          />
        </>
      )}
    </>
  );
}
