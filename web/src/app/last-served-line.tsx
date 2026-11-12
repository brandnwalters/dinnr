import { shortDiningDate } from "@/lib/dining-date";
import { cn } from "@/lib/utils";
import type { LastServed } from "@/lib/today";

/**
 * "Last served at Chase, Tue Nov 3, Dinner", or nothing when there's no earlier record.
 */
export function LastServedLine({ lastServed, className }: { lastServed?: LastServed; className?: string }) {
  if (!lastServed) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {`Last served at ${lastServed.hallName}, ${shortDiningDate(lastServed.date)}, ${lastServed.mealPeriod}`}
    </p>
  );
}
