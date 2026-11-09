"use client";

import { useSearchParams } from "next/navigation";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { MenuSkeleton } from "../menu-skeleton";
import { useTodayMenu } from "../today-menu-provider";
import { CombosScreen } from "./combos-screen";

/**
 * The Combos tab, filled from the shell's shared menu, the `?meal=` / `?hall=`
 * URL state and the targets saved on the device (edits save as they're typed).
 */
export function CombosView() {
  const menu = useTodayMenu();
  const [preferences, updatePreferences] = usePreferences();
  const searchParams = useSearchParams();
  if (!menu || !preferences) return <MenuSkeleton />;
  return (
    <CombosScreen
      halls={menu.halls}
      query={{ meal: searchParams.get("meal") ?? undefined, hall: searchParams.get("hall") ?? undefined }}
      targets={preferences.macroTargets}
      onTargetsChange={(macroTargets) => updatePreferences((p) => ({ ...p, macroTargets }))}
      includeExcludedStations={preferences.includeExcludedStations}
      onIncludeExcludedStationsChange={(includeExcludedStations) =>
        updatePreferences((p) => ({ ...p, includeExcludedStations }))
      }
      dietFilters={preferences.dietFilters}
      allergens={preferences.allergens}
      onClearFilters={() => updatePreferences(clearFilters)}
    />
  );
}
