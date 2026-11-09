import { cn } from "@/lib/utils";

/** One gray placeholder block. */
export function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

/**
 * Placeholders shown while preferences are read and today's menus load (Today,
 * Menus, Combos): a switcher bar and a few rows per hall column. Announced to
 * assistive tech as "Loading today's menus".
 */
export function MenuSkeleton({ columns = 2 }: { columns?: number }) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">Loading today&apos;s menus</span>
      <Bone className="h-tap w-full" />
      <div aria-hidden className="grid grid-cols-1 gap-6 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className={cn("flex flex-col gap-3", column > 0 && "hidden lg:flex")}>
            <Bone className="h-6 w-1/2" />
            <Bone className="h-4 w-1/3" />
            {Array.from({ length: 5 }, (_, row) => (
              <Bone key={row} className="h-tap w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
