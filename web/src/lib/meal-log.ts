import { MACROS, type Macros } from "./combos";
import { diningDate } from "./dining-date";
import type { MenuItem } from "./today";

/**
 * The meal log (on the device, no account): the hall dishes the student ate,
 * one log entry per dish logged. Pure and isomorphic: the shape, validation
 * and operations live here; `meal-log-store.ts` persists it in localStorage.
 */

/** Where a dish was served: the hall's slug (stable) and name (for display). */
export type LoggedHall = { slug: string; name: string };

/**
 * One logged dish. `date` is the dining day it was logged on (YYYY-MM-DD,
 * America/New_York). `perServing` is copied from the dish's nutrition when it's
 * logged, so totals never depend on a later menu.
 */
export type LogEntry = {
  id: string;
  date: string;
  hall: LoggedHall;
  mealPeriod: string;
  name: string;
  normalizedName: string;
  recipeId: number;
  /** A multiple of ½, at least ½. */
  servings: number;
  perServing: Macros;
};

export type MealLog = { entries: LogEntry[] };

export const EMPTY_MEAL_LOG: MealLog = { entries: [] };

/**
 * The stored form's version. Bump it only when an entry's shape or meaning
 * changes, and then migrate from the old version in `parseMealLog` (any other
 * version falls back to an empty log).
 */
export const MEAL_LOG_VERSION = 1;

/** The localStorage key the store (`meal-log-store.ts`) saves under, beside the preferences key. */
export const MEAL_LOG_STORAGE_KEY = "dinnr:meal-log";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0;
const isAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** One untrusted stored entry -> a valid entry, or null. */
function parseEntry(raw: unknown): LogEntry | null {
  if (!isRecord(raw)) return null;
  const { id, date, hall, mealPeriod, name, normalizedName, recipeId, servings, perServing } = raw;
  if (!isText(id) || !isDate(date) || !isText(mealPeriod) || !isText(name) || !isText(normalizedName)) return null;
  if (!Number.isInteger(recipeId) || !isServings(servings)) return null;
  if (!isRecord(hall) || !isText(hall.slug) || !isText(hall.name)) return null;
  if (!isRecord(perServing) || !MACROS.every((m) => isAmount(perServing[m]))) return null;
  return {
    id,
    date,
    hall: { slug: hall.slug, name: hall.name },
    mealPeriod,
    name,
    normalizedName,
    recipeId: recipeId as number,
    servings,
    perServing: Object.fromEntries(MACROS.map((m) => [m, perServing[m]])) as Macros,
  };
}

/** Any untrusted value (stored JSON) -> a valid log: invalid entries are dropped, other versions read as empty. */
export function parseMealLog(raw: unknown): MealLog {
  if (!isRecord(raw) || raw.version !== MEAL_LOG_VERSION || !Array.isArray(raw.entries)) return EMPTY_MEAL_LOG;
  return { entries: raw.entries.map(parseEntry).filter((e) => e !== null) };
}

/** The stored form: the log plus its version. */
export function serializeMealLog(log: MealLog): string {
  return JSON.stringify({ version: MEAL_LOG_VERSION, ...log });
}

/** What "I ate this" logs: a dish from one hall's meal period, and how much of it. */
export type DishToLog = { item: MenuItem; hall: LoggedHall; mealPeriod: string; servings: number };

let lastId = 0;
/** A unique-enough id for an entry on this device. */
function newId(now: Date): string {
  lastId += 1;
  return `${now.getTime().toString(36)}-${lastId.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The servings stepper's step, and the most one entry may hold. */
export const SERVINGS_STEP = 0.5;
export const MAX_SERVINGS_PER_ENTRY = 10;

/** Whether `n` is a loggable servings amount: a multiple of ½ from ½ to `MAX_SERVINGS_PER_ENTRY`. */
export function isServings(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isInteger(n / SERVINGS_STEP) &&
    n >= SERVINGS_STEP &&
    n <= MAX_SERVINGS_PER_ENTRY
  );
}

/** A dish's per-serving macros, or null unless its label gives all four. */
function perServingMacros(item: MenuItem): Macros | null {
  const nu = item.nutrition;
  if (!nu || nu.calories == null || nu.proteinG == null || nu.carbsG == null || nu.fatG == null) return null;
  return { calories: nu.calories, proteinG: nu.proteinG, carbsG: nu.carbsG, fatG: nu.fatG };
}

/**
 * Why `item` can't be logged ("I ate this" shows it on the disabled button),
 * or null when it can: logging needs all four macros so totals are never
 * silently wrong.
 */
export function unloggableReason(item: MenuItem): string | null {
  return perServingMacros(item) ? null : "No nutrition data for this dish, so it can't be logged.";
}

/** `log` with `dish` added on the dining day at `now` (unchanged if the dish or servings can't be logged). */
export function addEntry(log: MealLog, { item, hall, mealPeriod, servings }: DishToLog, now: Date): MealLog {
  const perServing = perServingMacros(item);
  if (!perServing || !isServings(servings)) return log;
  const entry: LogEntry = {
    id: newId(now),
    date: diningDate(now),
    hall: { slug: hall.slug, name: hall.name },
    mealPeriod,
    name: item.name,
    normalizedName: item.normalizedName,
    recipeId: item.recipeId,
    servings,
    perServing,
  };
  return { entries: [...log.entries, entry] };
}

/** `log` with entry `id` set to `servings` (unchanged if that isn't a loggable amount). */
export function changeServings(log: MealLog, id: string, servings: number): MealLog {
  if (!isServings(servings)) return log;
  return { entries: log.entries.map((e) => (e.id === id ? { ...e, servings } : e)) };
}

/** `log` without entry `id`. */
export function deleteEntry(log: MealLog, id: string): MealLog {
  const entries = log.entries.filter((e) => e.id !== id);
  return entries.length === log.entries.length ? log : { entries };
}

/** The entries logged on `date` (YYYY-MM-DD), in the order they were logged. */
export function entriesOn(log: MealLog, date: string): LogEntry[] {
  return log.entries.filter((e) => e.date === date);
}

/** What `entries` add up to: each entry's per-serving macros times its servings. */
export function entriesTotals(entries: readonly LogEntry[]): Macros {
  const totals: Macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  for (const e of entries) {
    for (const macro of MACROS) totals[macro] += e.perServing[macro] * e.servings;
  }
  return totals;
}

/** What was logged on `date` adds up to. */
export function dayTotals(log: MealLog, date: string): Macros {
  return entriesTotals(entriesOn(log, date));
}

/** How many days before today the log keeps (and Macros lists under "Past 7 days"). */
export const PAST_DAYS = 7;

/** The calendar date `days` after `date` (YYYY-MM-DD; negative goes back). */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whether `date` is `today` or one of the `PAST_DAYS` days before it. */
function isKept(date: string, today: string): boolean {
  // YYYY-MM-DD strings compare correctly as text.
  return addDays(today, -PAST_DAYS) <= date && date <= today;
}

/** `log` with only the entries from `today` (YYYY-MM-DD) and the `PAST_DAYS` days before it. */
export function pruneMealLog(log: MealLog, today: string): MealLog {
  const entries = log.entries.filter((e) => isKept(e.date, today));
  return entries.length === log.entries.length ? log : { entries };
}

/** One earlier day of the log: its entries (in logged order) and what they add up to. */
export type LoggedDay = { date: string; entries: LogEntry[]; totals: Macros };

/** The `PAST_DAYS` days before `today` that have entries, newest first. */
export function pastDays(log: MealLog, today: string): LoggedDay[] {
  const days: LoggedDay[] = [];
  for (let back = 1; back <= PAST_DAYS; back++) {
    const date = addDays(today, -back);
    const entries = entriesOn(log, date);
    if (entries.length > 0) days.push({ date, entries, totals: entriesTotals(entries) });
  }
  return days;
}
