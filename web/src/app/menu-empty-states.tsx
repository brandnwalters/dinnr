import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * The friendly, centered messages a hall's menu shows instead of dishes:
 * filters hid everything (with a one-tap way back), or no menu has been
 * posted for today yet. Presentational.
 */

function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children}
    </div>
  );
}

/**
 * Filters hid every dish: explains why and, given `onClearFilters`, offers
 * "Clear filters" (turns off the diet and allergen filters).
 */
export function NoMatchingItems({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState title="No items match your filters">
      <p className="text-sm text-muted-foreground">Your diet and allergen filters hide every dish here.</p>
      {onClearFilters && (
        <Button variant="outline" className="mt-2 min-h-tap px-4" onClick={onClearFilters}>
          Clear filters
        </Button>
      )}
    </EmptyState>
  );
}

/** No menu has been scraped for this hall today. */
export function NoMenuYet() {
  return (
    <EmptyState title="No menu for today yet">
      <p className="text-sm text-muted-foreground">UNC Dining hasn&apos;t posted it yet. Check back later.</p>
    </EmptyState>
  );
}
