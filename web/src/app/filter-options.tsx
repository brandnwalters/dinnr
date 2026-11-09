import { SlidersHorizontal } from "lucide-react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ALLERGENS, type Allergen } from "@/lib/allergens";
import { DIETARY_TAGS, type DietaryTag } from "@/lib/dietary-tags";
import type { Filters } from "@/lib/preferences";
import { AllergenDisclaimer } from "./allergen-disclaimer";
import { DIET_CHIP_CLASS } from "./diet-chips";

/**
 * The filter sheet's contents: one toggle chip per diet tag and allergen, and
 * a legend of the diet abbreviations the menu rows use.
 * Strict cutoffs: an item must carry every pressed diet tag, and none of the
 * pressed allergens. The allergen disclaimer shows while any allergen is
 * pressed. Presentational, so it renders to static markup in tests;
 * `FilterSheet` wires it to the on-device preferences.
 */
export function FilterOptions({ filters, onChange }: { filters: Filters; onChange?: (filters: Filters) => void }) {
  const { dietFilters, allergens } = filters;
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup
        legend="Only show items that are"
        options={DIETARY_TAGS}
        selected={dietFilters}
        onChange={onChange && ((dietFilters: DietaryTag[]) => onChange({ ...filters, dietFilters }))}
      />
      <ChipGroup
        legend="Hide items containing"
        options={ALLERGENS}
        selected={allergens}
        onChange={onChange && ((allergens: Allergen[]) => onChange({ ...filters, allergens }))}
      />
      <AllergenDisclaimer allergens={allergens} />
      <AbbreviationLegend />
    </div>
  );
}

/** What each diet chip on the menu rows stands for ("VG Vegan"), so students can read the rows. */
function AbbreviationLegend() {
  return (
    <section aria-labelledby="diet-abbreviations">
      <h3 id="diet-abbreviations" className="mb-2 text-sm font-medium">
        Menu abbreviations
      </h3>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
        {DIETARY_TAGS.map(({ code, label, abbreviation }) => (
          <Fragment key={code}>
            <dt className={DIET_CHIP_CLASS}>{abbreviation}</dt>
            <dd>{label}</dd>
          </Fragment>
        ))}
      </dl>
    </section>
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
export function FilterButton({ filters, ...props }: { filters: Filters } & React.ComponentProps<typeof Button>) {
  const count = filters.dietFilters.length + filters.allergens.length;
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
