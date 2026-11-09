import Link from "next/link";
import { cn } from "@/lib/utils";

/** One option: its label and the query-parameter value it selects. */
export type Segment = { value: string; label: string };

/**
 * A segmented control whose options are links that set one query parameter
 * (`param`), keeping the rest of `query` and the current page. The URL is the
 * state, so a refresh or a shared link shows the same choice. The selected
 * option carries `aria-current`, so assistive tech announces it. Shared by the
 * meal-period and hall switchers.
 */
export function SegmentedControl({
  label,
  param,
  segments,
  selected,
  query,
  className,
}: {
  /** Accessible name of the control, e.g. "Meal period". */
  label: string;
  param: string;
  segments: readonly Segment[];
  selected: string | null;
  /** The page's current query parameters. */
  query: Readonly<Record<string, string>>;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("overflow-x-auto", className)}>
      <ul className="inline-flex min-w-full gap-1 rounded-lg bg-muted p-1">
        {segments.map(({ value, label }) => {
          const current = value === selected;
          return (
            <li key={value} className="flex flex-1">
              <Link
                href={{ query: { ...query, [param]: value } }}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "flex min-h-tap flex-1 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap",
                  current ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
