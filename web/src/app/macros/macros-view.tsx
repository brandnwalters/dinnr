"use client";

import { useSearchParams } from "next/navigation";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { hallQuery } from "../hall-columns";
import { MenuSkeleton } from "../menu-skeleton";
import { useTodayMenu } from "../today-menu-provider";
import { MacrosScreen } from "./macros-screen";

/**
 * The Macros tab, filled from the shell's shared menu, the `?meal=` / `?hall=`
 * URL state and the targets saved on the device (edits save as they're typed).
 */
export function MacrosView() {
  const menu = useTodayMenu();
  const [preferences, updatePreferences] = usePreferences();
  const searchParams = useSearchParams();
  if (!menu || !preferences) return <MenuSkeleton />;
  return (
    <MacrosScreen
      halls={menu.halls}
      query={hallQuery(searchParams)}
      targets={preferences.macroTargets}
      onTargetsChange={(macroTargets) => updatePreferences((p) => ({ ...p, macroTargets }))}
      includeExcludedStations={preferences.includeExcludedStations}
      onIncludeExcludedStationsChange={(includeExcludedStations) =>
        updatePreferences((p) => ({ ...p, includeExcludedStations }))
      }
      filters={{ dietFilters: preferences.dietFilters, allergens: preferences.allergens }}
      onClearFilters={() => updatePreferences(clearFilters)}
    />
  );
}
