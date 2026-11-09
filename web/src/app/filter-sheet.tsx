"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { usePreferences } from "@/lib/preferences-store";
import { AllergenDisclaimer } from "./allergen-disclaimer";
import { FilterButton, FilterOptions } from "./filter-options";

/**
 * The header's filter button and the bottom sheet it opens, wired to the
 * on-device preferences. Changing a chip updates the stored diet and allergen
 * filters, which every screen showing menus reads.
 */
export function FilterSheet() {
  const [preferences, updatePreferences] = usePreferences();
  const dietFilters = preferences?.dietFilters ?? [];
  const allergens = preferences?.allergens ?? [];
  return (
    <Sheet>
      <SheetTrigger asChild>
        <FilterButton dietFilters={dietFilters} allergens={allergens} />
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto md:mx-auto md:max-w-2xl md:rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="text-lg">Filters</SheetTitle>
          <SheetDescription>Saved on this device and applied to every menu.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterOptions
            dietFilters={dietFilters}
            allergens={allergens}
            onDietFiltersChange={(dietFilters) => updatePreferences((p) => ({ ...p, dietFilters }))}
            onAllergensChange={(allergens) => updatePreferences((p) => ({ ...p, allergens }))}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** A slim allergen disclaimer under the header, on every screen, while any allergen filter is on. */
export function AllergenBanner() {
  const [preferences] = usePreferences();
  return (
    <AllergenDisclaimer
      allergens={preferences?.allergens ?? []}
      className="rounded-none border-l-0 border-b border-warning/40 px-4 py-1.5 text-center text-xs"
    />
  );
}
