/**
 * A group of filter toggles, one checkbox per code (diet tags, allergens).
 * `selected` keeps the order the user checked them in.
 */
export function CheckboxFilters<Code extends string>({
  legend,
  name,
  options,
  selected,
  onChange,
}: {
  legend: string;
  /** The checkboxes' form `name`. */
  name: string;
  options: readonly { code: Code; label: string }[];
  selected: readonly Code[];
  onChange: (selected: Code[]) => void;
}) {
  const toggle = (code: Code, on: boolean) =>
    onChange(on ? [...selected, code] : selected.filter((c) => c !== code));
  return (
    <fieldset className="checkbox-filters">
      <legend>{legend}</legend>
      {options.map(({ code, label }) => (
        <label key={code}>
          <input
            type="checkbox"
            name={name}
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
