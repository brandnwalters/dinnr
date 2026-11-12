import { cn } from "@/lib/utils";
import type { LastServed } from "@/lib/today";

/** "Tue Nov 3" for a dining date "2026-11-03" (a calendar date, so read in UTC to keep the day). */
function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(",", "");
}

/**
 * "Last served at Chase, Tue Nov 3, Dinner", or nothing when there's no earlier record.
 */
export function LastServedLine({ lastServed, className }: { lastServed?: LastServed; className?: string }) {
  if (!lastServed) return null;
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {`Last served at ${lastServed.hallName}, ${shortDate(lastServed.date)}, ${lastServed.mealPeriod}`}
    </p>
  );
}
