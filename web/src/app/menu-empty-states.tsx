import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Hall } from "@/lib/today";

/**
 * The friendly, centered messages a hall's menu shows instead of dishes:
 * filters hid everything (with a one-tap way back), the hall is closed all
 * day, or no menu has been posted for today yet. Presentational.
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

/** UNC Dining lists the hall as closed all day today. */
export function ClosedToday() {
  return (
    <EmptyState title="Closed all day">
      <p className="text-sm text-muted-foreground">This hall isn&apos;t serving today. Try the other one.</p>
    </EmptyState>
  );
}

/**
 * What a hall with nothing to show all day says instead of a meal period:
 * `ClosedToday` or `NoMenuYet`, or null for a hall with menus today.
 */
export function AllDayEmptyState({ hall }: { hall: Hall }) {
  if (hall.status === "closed-today") return <ClosedToday />;
  if (hall.status === "no-menu") return <NoMenuYet />;
  return null;
}

/** No menu has been scraped for this hall today. */
export function NoMenuYet() {
  return (
    <EmptyState title="Nothing posted yet">
      <p className="text-sm text-muted-foreground">UNC Dining hasn&apos;t posted today&apos;s menu. Check back later.</p>
    </EmptyState>
  );
}
