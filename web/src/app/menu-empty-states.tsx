import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Hall, HallStatus } from "@/lib/today";

/**
 * The friendly, centered messages shown where dishes or combos would be:
 * filters hid everything (with a one-tap way back), the hall is closed all
 * day, or no menu has been posted for today yet. Presentational.
 */

/**
 * One centered empty state: an optional icon, a short title, the explanation
 * and, as `children`, an optional way out (such as a button).
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon aria-hidden className="size-6 text-muted-foreground" />}
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
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
    <EmptyState title="No items match your filters" description="Your diet and allergen filters hide every dish here.">
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
  return <EmptyState title="Closed all day" description="This hall isn't serving today. Try the other one." />;
}

/** No menu has been scraped for this hall today. */
export function NoMenuYet() {
  return <EmptyState title="Nothing posted yet" description="UNC Dining hasn't posted today's menu. Check back later." />;
}

/** The statuses with nothing to show all day, and what each shows instead of a meal period. */
const ALL_DAY_EMPTY_STATES: Partial<Record<HallStatus, () => ReactNode>> = {
  "closed-today": ClosedToday,
  "no-menu": NoMenuYet,
};

/**
 * What a hall with nothing to show all day (closed, or no menu yet) says
 * instead of a meal period, or null for a hall with menus today. A function
 * rather than a component so callers can fall back with `??`.
 */
export function allDayEmptyState(hall: Hall): ReactNode | null {
  const State = ALL_DAY_EMPTY_STATES[hall.status];
  return State ? <State /> : null;
}
