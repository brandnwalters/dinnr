import type { Hall, HallStatus, MealPeriod } from "./today";

/**
 * How a hall's status and a meal period's hours read on screen: "Open now:
 * Lunch until 2:30pm", "11am–2:30pm". Pure and isomorphic (types only from
 * `today.ts`), so client components can use it.
 */

/** "17:00" -> "5pm", "10:30" -> "10:30am". */
export function clock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`}${h < 12 ? "am" : "pm"}`;
}

/** A meal period's hours, e.g. "11am–2:30pm", or null without readable times. */
export function hours(mealPeriod: MealPeriod): string | null {
  return mealPeriod.start && mealPeriod.end ? `${clock(mealPeriod.start)}–${clock(mealPeriod.end)}` : null;
}

/** The color family a status is drawn in: serving (green), opens later (amber), or closed / no menu (gray). */
export type StatusTone = "serving" | "opens-later" | "closed";

/**
 * Everything that depends on a hall's status, in one place: its tone and its
 * wording (given the hall's current meal period, set while serving or opening later).
 */
const HALL_STATUSES: Record<HallStatus, { tone: StatusTone; text: (current: MealPeriod | undefined) => string }> = {
  serving: { tone: "serving", text: (current) => `Open now: ${current!.name} until ${clock(current!.end!)}` },
  "opens-later": { tone: "opens-later", text: (current) => `${current!.name} starts at ${clock(current!.start!)}` },
  "done-for-today": { tone: "closed", text: () => "Closed for the rest of today" },
  "closed-today": { tone: "closed", text: () => "Closed today" },
  "no-menu": { tone: "closed", text: () => "No menu for today yet" },
};

/** The hall's status line, e.g. "Open now: Lunch until 2:30pm" or "Closed today". */
export function statusText(hall: Hall): string {
  const current = hall.mealPeriods.find((mp) => mp.name === hall.currentMealPeriod);
  return HALL_STATUSES[hall.status].text(current);
}

/** The color family the hall's status is drawn in. */
export function statusTone(hall: Hall): StatusTone {
  return HALL_STATUSES[hall.status].tone;
}
