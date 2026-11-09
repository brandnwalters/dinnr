import { dietaryTagAbbreviation, dietaryTagLabel } from "@/lib/dietary-tags";

/**
 * An item's dietary tags (UNC codes) as small abbreviated chips ("VG", "GF"),
 * each labelled with the full tag name for screen readers and on hover. The
 * filter sheet's legend explains the abbreviations.
 */
export function DietChips({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label="Dietary tags" className="flex flex-wrap gap-1">
      {tags.map((code) => (
        <li key={code}>
          <DietChip code={code} />
        </li>
      ))}
    </ul>
  );
}

/** How an abbreviation chip looks, shared with the filter sheet's legend. */
export const DIET_CHIP_CLASS =
  "inline-flex min-w-6 justify-center rounded-sm bg-muted px-1 text-xs leading-5 font-semibold text-muted-foreground";

/** One tag's abbreviation as a chip, named by the full tag name. */
function DietChip({ code }: { code: string }) {
  const label = dietaryTagLabel(code);
  return (
    <span role="img" aria-label={label} title={label} className={DIET_CHIP_CLASS}>
      {dietaryTagAbbreviation(code)}
    </span>
  );
}
