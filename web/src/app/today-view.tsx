"use client";

import { useSearchParams } from "next/navigation";
import { ALLERGENS } from "@/lib/allergens";
import { DIETARY_TAGS } from "@/lib/dietary-tags";
import { toggleFavorite } from "@/lib/favorites";
import { withSelectedMeal } from "@/lib/meal-periods";
import { usePreferences } from "@/lib/preferences-store";
import { AllergenDisclaimer } from "./allergen-disclaimer";
import { CheckboxFilters } from "./checkbox-filters";
import { HallMenu } from "./hall-menu";
import { MacroCombos } from "./macro-combos";
import { MenuSkeleton } from "./menu-skeleton";
import { useTodayMenu } from "./today-menu-provider";

/**
 * The home page body, filled from the menus the app shell loaded
 * (`useTodayMenu`). The selected meal (`?meal=Dinner`, set by each hall's
 * meal switcher) switches every hall that serves it today; the others keep
 * their current meal. Skeletons show until preferences are read and the menus
 * have loaded, so filtered-out items never flash on screen.
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const meal = useSearchParams().get("meal"); // switches every hall that serves it today
  const today = useTodayMenu();
  const halls = today?.halls.map((hall) => withSelectedMeal(hall, meal));

  if (!preferences) return <MenuSkeleton />;
  return (
    <>
      {/* Strict cutoffs: an item must carry every checked diet tag, and none of the checked allergens. */}
      <CheckboxFilters
        legend="Only show items that are"
        name="diet"
        options={DIETARY_TAGS}
        selected={preferences.dietFilters}
        onChange={(dietFilters) => updatePreferences((p) => ({ ...p, dietFilters }))}
      />
      <CheckboxFilters
        legend="Hide items containing"
        name="allergen"
        options={ALLERGENS}
        selected={preferences.allergens}
        onChange={(allergens) => updatePreferences((p) => ({ ...p, allergens }))}
      />
      <AllergenDisclaimer allergens={preferences.allergens} />
      {!halls ? (
        <MenuSkeleton />
      ) : (
        // One column per hall from tablet width up, stacked on narrow screens.
        <>
          <div className="mt-4 grid grid-cols-1 gap-6 md:grid-flow-col md:auto-cols-fr md:grid-cols-none">
            {halls.map((hall) => (
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
            halls={halls}
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
