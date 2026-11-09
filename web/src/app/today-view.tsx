"use client";

import { useSearchParams } from "next/navigation";
import { toggleFavorite } from "@/lib/favorites";
import { withSelectedMeal } from "@/lib/meal-periods";
import { usePreferences } from "@/lib/preferences-store";
import { HallMenu } from "./hall-menu";
import { MenuSkeleton } from "./menu-skeleton";
import { useTodayMenu } from "./today-menu-provider";

/**
 * The home page body, filled from the menus the app shell loaded
 * (`useTodayMenu`). The selected meal (`?meal=Dinner`, set by each hall's
 * meal switcher) switches every hall that serves it today; the others keep
 * their current meal. Skeletons show until preferences are read and the menus
 * have loaded, so filtered-out items never flash on screen. Diet and allergen
 * filters are set in the header's filter sheet (`FilterSheet`).
 */
export function TodayView() {
  const [preferences, updatePreferences] = usePreferences();
  const meal = useSearchParams().get("meal"); // switches every hall that serves it today
  const today = useTodayMenu();
  const halls = today?.halls.map((hall) => withSelectedMeal(hall, meal));

  if (!preferences || !halls) return <MenuSkeleton />;
  return (
    // One column per hall from tablet width up, stacked on narrow screens.
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
  );
}
