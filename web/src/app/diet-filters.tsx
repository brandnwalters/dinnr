import { DIETARY_TAGS, type DietaryTag } from "@/lib/dietary-tags";

/** Diet filter toggles. Strict cutoffs: an item must carry every checked tag. */
export function DietFilters({
  selected,
  onChange,
}: {
  selected: DietaryTag[];
  onChange: (selected: DietaryTag[]) => void;
}) {
  const toggle = (code: DietaryTag, on: boolean) =>
    onChange(on ? [...selected, code] : selected.filter((c) => c !== code));
  return (
    <fieldset className="diet-filters">
      <legend>Only show items that are</legend>
      {DIETARY_TAGS.map(({ code, label }) => (
        <label key={code}>
          <input
            type="checkbox"
            name="diet"
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
