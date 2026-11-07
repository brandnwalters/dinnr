import type { Allergen } from "@/lib/allergens";

/**
 * The allergen disclaimer, shown whenever an allergen filter is on (and only
 * then: it renders nothing when `allergens` is empty). Reusable: any view that
 * hides items by allergen (the Today menus, the combos view) renders it with
 * the user's chosen allergens. Never present allergen filtering as a guarantee.
 */
export function AllergenDisclaimer({ allergens }: { allergens: readonly Allergen[] }) {
  if (allergens.length === 0) return null;
  return (
    <p role="note" className="allergen-disclaimer">
      <strong>Allergen filters are not a guarantee.</strong> They are based on UNC Dining&apos;s labels, and
      cross-contact with other foods is possible. If you have a severe allergy, ask the dining staff before eating.
    </p>
  );
}
