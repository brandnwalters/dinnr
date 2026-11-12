// UI smoke tests: the Usual hours sheet's contents (one row per weekday, closed and unknown days, the note).
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import type { UsualHours } from "@/lib/usual-hours";
import { UsualHoursContents } from "./usual-hours-sheet";

const WEEK: UsualHours = [
  {
    weekday: "Monday",
    status: "open",
    date: "2026-11-09",
    mealPeriods: [
      { name: "Breakfast", start: "07:00", end: "10:30" },
      { name: "Lunch", start: "11:00", end: "14:30" },
    ],
  },
  { weekday: "Tuesday", status: "unknown" },
  {
    weekday: "Wednesday",
    status: "open",
    date: "2026-11-11",
    mealPeriods: [{ name: "Late Night", start: null, end: null }],
  },
  { weekday: "Thursday", status: "unknown" },
  { weekday: "Friday", status: "unknown" },
  { weekday: "Saturday", status: "closed", date: "2026-11-07" },
  { weekday: "Sunday", status: "unknown" },
];

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("lists every weekday with its meal periods and hours, Closed, or – with no data", () => {
  const shown = text(renderToStaticMarkup(<UsualHoursContents usualHours={WEEK} />));

  expect(shown).toContain(
    "Monday Breakfast 7am–10:30am Lunch 11am–2:30pm Tuesday – Wednesday Late Night Thursday – Friday – Saturday Closed Sunday –",
  );
});

test("says these are usual hours from recent weeks, not an official schedule", () => {
  const shown = text(renderToStaticMarkup(<UsualHoursContents usualHours={WEEK} />));

  expect(shown).toContain("based on recent weeks, not an official schedule");
});
