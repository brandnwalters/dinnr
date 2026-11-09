import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ALLERGENS, type Allergen } from "@/lib/allergens";
import { DIETARY_TAGS, type DietaryTag } from "@/lib/dietary-tags";
import { AllergenDisclaimer } from "./allergen-disclaimer";

/**
 * The filter sheet's contents: one toggle chip per diet tag and allergen.
 * Strict cutoffs: an item must carry every pressed diet tag, and none of the
 * pressed allergens. The allergen disclaimer shows while any allergen is
 * pressed. Presentational, so it renders to static markup in tests;
 * `FilterSheet` wires it to the on-device preferences.
 */
export function FilterOptions({
  dietFilters,
  allergens,
  onDietFiltersChange,
  onAllergensChange,
}: {
  dietFilters: readonly DietaryTag[];
  allergens: readonly Allergen[];
  onDietFiltersChange?: (dietFilters: DietaryTag[]) => void;
  onAllergensChange?: (allergens: Allergen[]) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup
        legend="Only show items that are"
        options={DIETARY_TAGS}
        selected={dietFilters}
        onChange={onDietFiltersChange}
      />
      <ChipGroup
        legend="Hide items containing"
        options={ALLERGENS}
        selected={allergens}
        onChange={onAllergensChange}
      />
      <AllergenDisclaimer allergens={allergens} />
    </div>
  );
}

/** A labelled group of toggle chips. `selected` keeps the order the user pressed them in. */
function ChipGroup<Code extends string>({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: readonly { code: Code; label: string }[];
  selected: readonly Code[];
  onChange?: (selected: Code[]) => void;
}) {
  const toggle = (code: Code, on: boolean) =>
    onChange?.(on ? [...selected, code] : selected.filter((c) => c !== code));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ code, label }) => (
          <Toggle
            key={code}
            variant="outline"
            pressed={selected.includes(code)}
            onPressedChange={(on) => toggle(code, on)}
            className="min-h-tap rounded-full px-4 data-[state=on]:border-brand data-[state=on]:bg-brand/15"
          >
            {label}
          </Toggle>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The header's filter button, with a badge counting the active diet and
 * allergen filters (none at zero). Extra props are passed to the button, so a
 * sheet trigger can wrap it (`asChild`).
 */
export function FilterButton({
  dietFilters,
  allergens,
  ...props
}: {
  dietFilters: readonly DietaryTag[];
  allergens: readonly Allergen[];
} & React.ComponentProps<typeof Button>) {
  const count = dietFilters.length + allergens.length;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-tap"
      aria-label={count === 0 ? "Filters" : `Filters, ${count} active`}
      className="relative"
      {...props}
    >
      <SlidersHorizontal aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
        >
          {count}
        </span>
      )}
    </Button>
  );
}
