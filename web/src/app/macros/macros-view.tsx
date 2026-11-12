"use client";

import { useSearchParams } from "next/navigation";
import { diningDate } from "@/lib/dining-date";
import { changeServings, deleteEntry } from "@/lib/meal-log";
import { useMealLog } from "@/lib/meal-log-store";
import { clearFilters } from "@/lib/preferences";
import { usePreferences } from "@/lib/preferences-store";
import { hallQuery } from "../hall-columns";
import { MenuSkeleton } from "../menu-skeleton";
import { useTodayMenu } from "../today-menu-provider";
import { MacrosScreen } from "./macros-screen";

/**
 * The Macros tab, filled from the shell's shared menu, the `?meal=` / `?hall=`
 * URL state, the targets saved on the device (edits save as they're typed)
 * and the on-device meal log (servings changes and deletes save at once).
 */
export function MacrosView() {
  const menu = useTodayMenu();
  const [preferences, updatePreferences] = usePreferences();
  const [log, updateLog] = useMealLog();
  const searchParams = useSearchParams();
  if (!menu || !preferences || !log) return <MenuSkeleton />;
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
      log={log}
      today={diningDate(new Date())}
      onChangeServings={(id, servings) => updateLog((l) => changeServings(l, id, servings))}
      onDeleteEntry={(id) => updateLog((l) => deleteEntry(l, id))}
    />
  );
}
