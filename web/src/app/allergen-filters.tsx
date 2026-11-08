import { ALLERGENS, type Allergen } from "@/lib/allergens";

/** Allergen toggles. Strict cutoffs: an item carrying any checked allergen is hidden. */
export function AllergenFilters({
  selected,
  onChange,
}: {
  selected: Allergen[];
  onChange: (selected: Allergen[]) => void;
}) {
  const toggle = (code: Allergen, on: boolean) =>
    onChange(on ? [...selected, code] : selected.filter((c) => c !== code));
  return (
    <fieldset className="diet-filters">
      <legend>Hide items containing</legend>
      {ALLERGENS.map(({ code, label }) => (
        <label key={code}>
          <input
            type="checkbox"
            name="allergen"
            value={code}
            checked={selected.includes(code)}
            onChange={(e) => toggle(code, e.target.checked)}
          />{" "}
          {label}
        </label>
      ))}
    </fieldset>
  );
}
