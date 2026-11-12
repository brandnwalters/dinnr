import { ChevronRight, NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MACROS, type Macro, type MacroRange, type Macros, type MacroTargets } from "@/lib/combos";
import { dayTotals, entriesOn, pastDays, type LogEntry, type MealLog } from "@/lib/meal-log";
import { cn } from "@/lib/utils";
import { ServingsStepper } from "../servings-stepper";
import { amount, MACRO_LABELS, rangeText } from "./macro-labels";

/**
 * The meal log on the Macros tab: today's progress against the daily targets,
 * today's entries by meal period, and the collapsed "Past 7 days". Entries can
 * have their servings changed or be deleted (`onChangeServings`,
 * `onDeleteEntry`; saving is the caller's job). Presentational.
 */

/** What editing an entry needs; absent callbacks render the controls inert (tests, loading). */
export type EntryActions = {
  onChangeServings?: (id: string, servings: number) => void;
  onDeleteEntry?: (id: string) => void;
};

/** Today's calories, protein, carbs and fat: a progress bar for each macro with a daily target, else the plain total. */
export function TodayProgress({ log, today, targets }: { log: MealLog; today: string; targets: MacroTargets }) {
  const totals = dayTotals(log, today);
  return (
    <section aria-labelledby="macros-today" className="flex flex-col gap-2 md:max-w-xl">
      <h2 id="macros-today" className="text-lg font-semibold">
        Today
      </h2>
      <ul className="flex flex-col gap-2">
        {MACROS.map((macro) => (
          <MacroProgress key={macro} macro={macro} total={totals[macro]} range={targets[macro]} />
        ))}
      </ul>
    </section>
  );
}

/**
 * One macro's line: "Protein 84 of ≥ 120 g" over a bar filled toward the
 * target (its max, else its min), drawn in the accent, or in the destructive
 * color once past a max. Without a target, just "Fat 15 g".
 */
function MacroProgress({ macro, total, range }: { macro: Macro; total: number; range: MacroRange | undefined }) {
  const { name, unit } = MACRO_LABELS[macro];
  const goal = range?.max ?? range?.min;
  if (!range || goal === undefined) {
    return (
      <li className="flex justify-between text-sm">
        <span>{name}</span>
        <span className="tabular-nums">
          {amount(total)} {unit}
        </span>
      </li>
    );
  }
  const over = range.max !== undefined && total > range.max;
  const fill = goal === 0 ? 100 : Math.min(100, (total / goal) * 100);
  const label = `${amount(total)} of ${rangeText(range)} ${unit}`;
  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex justify-between">
        <span>{name}</span>
        <span className="tabular-nums">{label}</span>
      </div>
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(Math.round(total), goal)}
        aria-valuetext={label}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-brand")} style={{ width: `${fill}%` }} />
      </div>
    </li>
  );
}

/** Today's entries grouped by meal period, or a hint on how to log when there are none. */
export function TodayEntries({ log, today, ...actions }: { log: MealLog; today: string } & EntryActions) {
  const entries = entriesOn(log, today);
  return (
    <Card size="sm" className="md:max-w-xl">
      <CardHeader>
        <CardTitle>
          <h2>Today&apos;s meals</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <NotebookPen aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              Nothing logged yet today. Open a dish on{" "}
              <Link href="/menus" className="underline underline-offset-4">
                Menus
              </Link>{" "}
              and tap &ldquo;I ate this&rdquo; to add it here.
            </p>
          </div>
        ) : (
          <EntriesByMeal entries={entries} {...actions} />
        )}
      </CardContent>
    </Card>
  );
}

/** `entries` under a heading per meal period, in the order each meal period was first logged. */
function EntriesByMeal({ entries, ...actions }: { entries: LogEntry[] } & EntryActions) {
  const meals = [...new Set(entries.map((e) => e.mealPeriod))];
  return (
    <div className="flex flex-col gap-3">
      {meals.map((meal) => (
        <section key={meal}>
          <h3 className="text-sm font-medium">{meal}</h3>
          <EntryList entries={entries.filter((e) => e.mealPeriod === meal)} {...actions} />
        </section>
      ))}
    </div>
  );
}

/** Entries, each with its hall and calories, a servings stepper and a delete button. */
function EntryList({ entries, onChangeServings, onDeleteEntry }: { entries: LogEntry[] } & EntryActions) {
  return (
    <ul>
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border/60 py-1.5 last:border-b-0"
        >
          <div className="flex min-w-0 flex-1 flex-col text-sm">
            <span className="font-medium break-words">{entry.name}</span>
            <small className="text-xs text-muted-foreground">
              {entry.hall.name} · {amount(entry.perServing.calories * entry.servings)} cal
            </small>
          </div>
          <ServingsStepper
            value={entry.servings}
            label={entry.name}
            onChange={onChangeServings && ((servings) => onChangeServings(entry.id, servings))}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-tap"
            aria-label={`Delete ${entry.name}`}
            onClick={onDeleteEntry && (() => onDeleteEntry(entry.id))}
          >
            <Trash2 aria-hidden className="text-muted-foreground" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** "Tue, Nov 10" for a YYYY-MM-DD dining day. */
function dayName(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** "300 cal · 6 g protein · 15 g carbs · 7.5 g fat". */
const totalsText = (totals: Macros) => MACROS.map((m) => `${amount(totals[m])} ${MACRO_LABELS[m].total}`).join(" · ");

/**
 * "Past 7 days", collapsed: one line per earlier day with entries (newest
 * first) giving its totals, each opening to its entries, which can be edited
 * or deleted (but not added to).
 */
export function PastDays({ log, today, ...actions }: { log: MealLog; today: string } & EntryActions) {
  const days = pastDays(log, today);
  return (
    <details className="group/past rounded-xl ring-1 ring-foreground/10 md:max-w-xl">
      <summary className="flex min-h-tap cursor-pointer items-center gap-2 px-3 font-medium">
        <ChevronRight aria-hidden className="size-4 transition-transform group-open/past:rotate-90" />
        Past 7 days
      </summary>
      <div className="flex flex-col gap-1 px-3 pb-3">
        {days.length === 0 && <p className="text-sm text-muted-foreground">Nothing logged in the past 7 days.</p>}
        {days.map((day) => (
          <details key={day.date} className="group/day">
            <summary className="flex min-h-tap cursor-pointer items-center gap-2 text-sm">
              <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform group-open/day:rotate-90" />
              <span>
                <span className="font-medium">{dayName(day.date)}</span>
                <span className="text-muted-foreground"> · {totalsText(day.totals)}</span>
              </span>
            </summary>
            <div className="pl-6">
              <EntriesByMeal entries={day.entries} {...actions} />
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
