/**
 * The combo engine: a pure function from one hall's meal-period items (with
 * nutrition) and the user's macro targets to the top combos that meet them.
 *
 * Constraints: at most `MAX_DISTINCT_ITEMS` distinct items, each at 1 or
 * `MAX_SERVINGS` whole servings. Only combos that meet every target are
 * returned. Ranking (see `RANKING`): fewest distinct items first, then the
 * smallest distance from the targets, then menu order. At most `MAX_COMBOS`.
 *
 * Pure and isomorphic: the combos UI runs it in the browser on the items
 * `getToday` already returned (so diet/allergen filters applied there carry
 * over). Build its input from a meal period with `comboItemsFrom`.
 */
import type { MealPeriod } from "./today";

export const MACROS = ["calories", "proteinG", "carbsG", "fatG"] as const;
export type Macro = (typeof MACROS)[number];
export type Macros = Record<Macro, number>;

/** Optional bounds for one macro. Either, both or neither may be set. */
export type MacroRange = { min?: number; max?: number };
/** The user's macro goals. A macro without a range is unconstrained. */
export type MacroTargets = Partial<Record<Macro, MacroRange>>;

/** One menu item the engine may use: macros are per serving and all known. */
export type ComboItem = { id: number; name: string; station: string; macros: Macros };

export type ComboInput = { items: ComboItem[]; targets: MacroTargets };

export type Combo = {
  items: { item: ComboItem; servings: number }[];
  totals: Macros;
  /** How far the totals are from the targets (0 = exactly on them); lower ranks higher. */
  distance: number;
};

/** `combos` is empty exactly when `message` explains why. */
export type ComboSuggestions = { combos: Combo[]; message: string | null };

export const MAX_DISTINCT_ITEMS = 3;
export const MAX_SERVINGS = 2;
export const MAX_COMBOS = 5;

/**
 * A combo during the search: item indices into the input and their servings.
 * Ranking keys read these cheap fields, so a combo is only built once it ranks.
 */
type Candidate = {
  size: number;
  distance: number;
  /** Input indices in menu order, with matching servings (the tie-breaker reads these). */
  picked: number[];
  servings: number[];
};

/** Menu order: earlier items first, then fewer servings. */
function menuOrder(a: Candidate, b: Candidate): number {
  for (let j = 0; j < Math.min(a.size, b.size); j++) {
    if (a.picked[j] !== b.picked[j]) return a.picked[j] - b.picked[j];
    if (a.servings[j] !== b.servings[j]) return a.servings[j] - b.servings[j];
  }
  return 0;
}

/**
 * Ranking keys, applied in order (negative = `a` ranks first). Extension point:
 * a favorites tie-breaker goes between fewest items and distance (add the field
 * to `Candidate` and fill it in `offer`). The search stops once `MAX_COMBOS`
 * combos of one size are found, which relies on fewest-items staying first.
 */
const RANKING: ((a: Candidate, b: Candidate) => number)[] = [
  (a, b) => a.size - b.size,
  (a, b) => a.distance - b.distance,
  menuOrder,
];
/**
 * A quick reject before the full `compare`, for the search's hot loop: true when
 * a combo of `size` items at `distance` surely ranks below `worst`. Must agree
 * with the keys in `RANKING` before `menuOrder` (a favorites key between size
 * and distance has to be checked here too, or this has to return false on it).
 */
function cannotBeat(size: number, distance: number, worst: Candidate): boolean {
  return size > worst.size || (size === worst.size && distance > worst.distance);
}

const compare = (a: Candidate, b: Candidate) => {
  for (const key of RANKING) {
    const d = key(a, b);
    if (d !== 0) return d;
  }
  return 0;
};

/** The point inside each range we aim for: the midpoint, or the single bound given. */
function aimPoint({ min, max }: MacroRange): number | null {
  if (min !== undefined && max !== undefined) return (min + max) / 2;
  return min ?? max ?? null;
}

export function suggestCombos({ items, targets }: ComboInput): ComboSuggestions {
  const aims = MACROS.map((m) => aimPoint(targets[m] ?? {}));
  const activeIdx = MACROS.map((_, k) => k).filter((k) => aims[k] !== null);
  if (activeIdx.length === 0) return { combos: [], message: "Set at least one target to see combos." };
  if (items.length === 0) {
    return { combos: [], message: "No items with nutrition info in this meal yet, so no combos." };
  }

  const n = items.length;
  const M = MACROS.length;
  const mins = MACROS.map((m) => targets[m]?.min ?? -Infinity);
  const maxs = MACROS.map((m) => targets[m]?.max ?? Infinity);
  // Search the richest items in the hardest minimum first, so the suffix-max pruning
  // below cuts whole branches early. `perm[w]` is the input index of search position w.
  const hardest = MACROS.map((_, k) => k)
    .filter((k) => mins[k] > 0)
    .sort((a, b) => mins[b] / maxOf(items, a) - mins[a] / maxOf(items, b))[0];
  const perm = items.map((_, i) => i);
  if (hardest !== undefined) perm.sort((a, b) => items[b].macros[MACROS[hardest]] - items[a].macros[MACROS[hardest]]);
  // Flat per-macro arrays keep the loops cheap on a phone (hundreds of items, millions of combos).
  const cols = MACROS.map((m) => Float64Array.from(perm, (i) => items[i].macros[m]));
  // suffixMax[k][i]: the most of macro k one serving of any item from i on gives (for pruning mins).
  const suffixMax = cols.map((col) => {
    const out = new Float64Array(n + 1);
    for (let i = n - 1; i >= 0; i--) out[i] = Math.max(col[i], out[i + 1]);
    return out;
  });
  const totals = new Float64Array(M);

  const best: Candidate[] = [];
  const path: number[] = []; // search positions
  const pathServings: number[] = [];
  const scratch: Candidate = { size: 0, distance: 0, picked: [], servings: [] };

  // Distance is relative to the aim so calories don't drown out grams; unset macros weigh 0.
  const aim = MACROS.map((_, k) => aims[k] ?? 0);
  const weight = MACROS.map((_, k) => (aims[k] === null ? 0 : 1 / Math.max(aims[k]!, 1)));
  const [c0, c1, c2, c3] = cols;
  const [mn0, mn1, mn2, mn3] = mins;
  const [mx0, mx1, mx2, mx3] = maxs;
  const [a0, a1, a2, a3] = aim;
  const [w0, w1, w2, w3] = weight;
  const hardCol = hardest === undefined ? null : cols[hardest];
  const hardMin = hardest === undefined ? -Infinity : mins[hardest];

  /** Ranks the combo at `path` (plus `lastPos`/`lastServings`) at distance `d`, if it makes the top. */
  const offer = (lastPos: number, lastServings: number, d: number) => {
    // Into menu order without allocating: this runs for every combo that meets the targets.
    const { picked, servings } = scratch;
    const size = path.length + 1;
    for (let j = 0; j < size; j++) {
      const i = perm[j < path.length ? path[j] : lastPos];
      const sv = j < path.length ? pathServings[j] : lastServings;
      let at = j;
      while (at > 0 && picked[at - 1] > i) {
        picked[at] = picked[at - 1];
        servings[at] = servings[at - 1];
        at--;
      }
      picked[at] = i;
      servings[at] = sv;
    }
    picked.length = servings.length = size;
    scratch.size = size;
    scratch.distance = d;
    if (best.length === MAX_COMBOS && compare(scratch, best[MAX_COMBOS - 1]) >= 0) return;
    best.push({ ...scratch, picked: [...picked], servings: [...servings] });
    best.sort(compare);
    if (best.length > MAX_COMBOS) best.pop();
  };

  /** The last item of a combo: the hot loop (millions of times on a big menu), so plain locals only. */
  const finish = (from: number) => {
    const size = path.length + 1;
    const t0 = totals[0], t1 = totals[1], t2 = totals[2], t3 = totals[3];
    const hardTotal = hardest === undefined ? 0 : totals[hardest];
    for (let i = from; i < n; i++) {
      // Sorted richest-first in the hardest minimum: once even 2 servings fall short, so does the rest.
      if (hardCol !== null && hardTotal + MAX_SERVINGS * hardCol[i] < hardMin) return;
      for (let s = 1; s <= MAX_SERVINGS; s++) {
        const v0 = t0 + s * c0[i], v1 = t1 + s * c1[i], v2 = t2 + s * c2[i], v3 = t3 + s * c3[i];
        if (v0 < mn0 || v0 > mx0 || v1 < mn1 || v1 > mx1 || v2 < mn2 || v2 > mx2 || v3 < mn3 || v3 > mx3) continue;
        const d = w0 * Math.abs(v0 - a0) + w1 * Math.abs(v1 - a1) + w2 * Math.abs(v2 - a2) + w3 * Math.abs(v3 - a3);
        if (best.length === MAX_COMBOS && cannotBeat(size, d, best[MAX_COMBOS - 1])) continue;
        offer(i, s, d);
      }
    }
  };

  // Depth-first over increasing item indices, exactly `size` distinct items.
  const extend = (from: number, size: number) => {
    const left = size - path.length;
    if (left === 1) return finish(from);
    for (let k = 0; k < M; k++) {
      // Even the richest remaining items can't reach this minimum: nothing below here fits.
      if (totals[k] + left * MAX_SERVINGS * suffixMax[k][from] < mins[k]) return;
    }
    for (let i = from; i <= n - left; i++) {
      for (let s = 1; s <= MAX_SERVINGS; s++) {
        let over = false;
        for (let k = 0; k < M; k++) {
          totals[k] += s * cols[k][i];
          if (totals[k] > maxs[k]) over = true; // macros are never negative: more can't help
        }
        if (!over) {
          path.push(i);
          pathServings.push(s);
          extend(i + 1, size);
          path.pop();
          pathServings.pop();
        }
        for (let k = 0; k < M; k++) totals[k] -= s * cols[k][i];
      }
    }
  };

  for (let size = 1; size <= MAX_DISTINCT_ITEMS && best.length < MAX_COMBOS; size++) extend(0, size);

  if (best.length === 0) {
    return {
      combos: [],
      message: `No combination of up to ${MAX_DISTINCT_ITEMS} items meets all your targets. Try loosening one.`,
    };
  }
  return {
    combos: best.map(({ picked, servings, distance }) => {
      const comboTotals = Object.fromEntries(
        MACROS.map((m) => [m, picked.reduce((sum, i, j) => sum + servings[j] * items[i].macros[m], 0)]),
      ) as Macros;
      return { items: picked.map((i, j) => ({ item: items[i], servings: servings[j] })), totals: comboTotals, distance };
    }),
    message: null,
  };
}

const maxOf = (items: ComboItem[], k: number) => Math.max(1e-9, ...items.map((it) => it.macros[MACROS[k]]));

/**
 * The items of one meal period the engine can use: those whose recipe
 * nutrition gives all four macros. Repeats of a recipe (two stations) count once.
 */
export function comboItemsFrom(mealPeriod: MealPeriod): ComboItem[] {
  const seen = new Set<number>();
  const out: ComboItem[] = [];
  for (const station of mealPeriod.stations) {
    for (const it of station.items) {
      const nu = it.nutrition;
      if (!nu || nu.calories == null || nu.proteinG == null || nu.carbsG == null || nu.fatG == null) continue;
      if (seen.has(it.recipeId)) continue;
      seen.add(it.recipeId);
      out.push({
        id: it.recipeId,
        name: it.name,
        station: station.name,
        macros: { calories: nu.calories, proteinG: nu.proteinG, carbsG: nu.carbsG, fatG: nu.fatG },
      });
    }
  }
  return out;
}
