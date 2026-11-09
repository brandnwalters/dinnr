import type { Allergen } from "@/lib/allergens";
import { cn } from "@/lib/utils";

/**
 * The allergen disclaimer, shown whenever an allergen filter is on (and only
 * then: it renders nothing when `allergens` is empty). Reusable: any view that
 * hides items by allergen (the filter sheet, the banner under the header, the
 * combos view) renders it with the user's chosen allergens. Never present
 * allergen filtering as a guarantee.
 */
export function AllergenDisclaimer({ allergens, className }: { allergens: readonly Allergen[]; className?: string }) {
  if (allergens.length === 0) return null;
  return (
    <p role="note" className={cn("rounded-md border-l-4 border-warning bg-warning/10 px-3 py-2 text-sm", className)}>
      <strong>Allergen filters are not a guarantee.</strong> They are based on UNC Dining&apos;s labels, and
      cross-contact with other foods is possible. If you have a severe allergy, ask the dining staff before eating.
    </p>
  );
}
