import { query } from "./db";

/**
 * Usual hours (server side): for each hall and weekday, the meal periods and
 * hours of the most recent saved menu day falling on that weekday. Inferred
 * from saved days, not an official schedule: the UI says so.
 */

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** `start`/`end` are local wall-clock times "HH:MM", or null if UNC's label had no readable hours. */
export type UsualMealPeriod = { name: string; start: string | null; end: string | null };

/**
 * One weekday's usual hours, from the most recent saved day on it (`date`):
 * - `open`: its meal periods in page order;
 * - `closed`: that day the hall was closed (UNC's page had no meal periods);
 * - `unknown`: no day on this weekday has been saved.
 */
export type UsualHoursDay =
  | { weekday: Weekday; status: "open"; date: string; mealPeriods: UsualMealPeriod[] }
  | { weekday: Weekday; status: "closed"; date: string }
  | { weekday: Weekday; status: "unknown" };

/** A hall's usual week, Monday to Sunday (always seven days). */
export type UsualHours = UsualHoursDay[];

type Row = {
  location_id: number;
  isodow: number; // 1 = Monday ... 7 = Sunday
  date: string;
  status: "open" | "closed";
  meal_period_name: string | null;
  start_time: string | null;
  end_time: string | null;
};

/** Postgres `time` comes back as "HH:MM:SS". */
const toHhmm = (t: string | null) => (t === null ? null : t.slice(0, 5));

/** Every hall's usual week, by location id. Halls with no saved days are absent (see `emptyWeek`). */
export async function getUsualHours(): Promise<Map<number, UsualHours>> {
  const rows = await query<Row>(
    `with latest as (
       select distinct on (location_id, extract(isodow from date))
              id, location_id, date, status, extract(isodow from date)::int as isodow
       from menu_day
       order by location_id, extract(isodow from date), date desc
     )
     select latest.location_id, latest.isodow, to_char(latest.date, 'YYYY-MM-DD') as date, latest.status,
            mp.name as meal_period_name, mp.start_time, mp.end_time
     from latest
     left join meal_period mp on mp.menu_day_id = latest.id
     order by latest.location_id, latest.isodow, mp.position`,
  );

  const byLocation = new Map<number, UsualHours>();
  for (const row of rows) {
    let week = byLocation.get(row.location_id);
    if (!week) {
      week = emptyWeek();
      byLocation.set(row.location_id, week);
    }
    const index = row.isodow - 1;
    let day = week[index];
    if (day.status === "unknown") {
      day =
        row.status === "closed" || row.meal_period_name === null
          ? { weekday: day.weekday, status: "closed", date: row.date }
          : { weekday: day.weekday, status: "open", date: row.date, mealPeriods: [] };
      week[index] = day;
    }
    if (day.status === "open" && row.meal_period_name !== null) {
      day.mealPeriods.push({ name: row.meal_period_name, start: toHhmm(row.start_time), end: toHhmm(row.end_time) });
    }
  }
  return byLocation;
}

/** A week with nothing saved: every weekday `unknown`. */
export function emptyWeek(): UsualHours {
  return WEEKDAYS.map((weekday) => ({ weekday, status: "unknown" }));
}
