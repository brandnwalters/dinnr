import { dietaryTagLabel } from "@/lib/dietary-tags";

/** An item's dietary tags (UNC codes) as small labelled badges. */
export function DietaryTagBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="dietary-tags" aria-label="Dietary tags">
      {tags.map((code) => (
        <li key={code} className="dietary-tag" data-tag={code}>
          {dietaryTagLabel(code)}
        </li>
      ))}
    </ul>
  );
}
