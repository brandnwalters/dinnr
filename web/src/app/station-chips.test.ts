// Smoke test: a station chip's jump opens the collapsed bar or Extras the station sits in.
// No DOM test environment, so the page is a tiny hand-built tree with just what the jump walks.
import { expect, test } from "vitest";
import { revealStation } from "./station-chips";

/** A fake element: a tag, an optional id, its parent, and `open` for `<details>`. */
type FakeElement = { tagName: string; id?: string; open?: boolean; parentElement: FakeElement | null };

const el = (tagName: string, parent: FakeElement | null, id?: string): FakeElement => ({
  tagName: tagName.toUpperCase(),
  ...(id ? { id } : {}),
  ...(tagName === "details" ? { open: false } : {}),
  parentElement: parent,
});

/** A document over `elements` with just `getElementById`, whose elements answer `closest("details")`. */
function fakeDocument(elements: FakeElement[]) {
  const withClosest = (e: FakeElement) =>
    Object.assign(e, {
      closest: (selector: string) => {
        if (selector !== "details") throw new Error(`unexpected selector ${selector}`);
        for (let n: FakeElement | null = e; n; n = n.parentElement) if (n.tagName === "DETAILS") return n;
        return null;
      },
    });
  elements.forEach(withClosest);
  return { getElementById: (id: string) => elements.find((e) => e.id === id) ?? null } as unknown as Document;
}

// A hall column: a main station, a collapsed bar, and collapsed Extras holding a station and a "Show all".
const column = el("div", null);
const grill = el("section", column, "station-chase-grill");
const grillShowAll = el("details", grill);
const saladBar = el("details", column, "station-chase-salad-bar");
const extras = el("details", column);
const beverages = el("section", extras, "station-chase-beverages");
const beveragesShowAll = el("details", beverages);
const page = fakeDocument([column, grill, grillShowAll, saladBar, extras, beverages, beveragesShowAll]);

test("jumping to a collapsed bar opens it", () => {
  expect(revealStation("station-chase-salad-bar", page)).toBe(saladBar);
  expect(saladBar.open).toBe(true);
});

test("jumping to a station in Extras opens Extras, but not that station's Show all", () => {
  expect(revealStation("station-chase-beverages", page)).toBe(beverages);
  expect(extras.open).toBe(true);
  expect(beveragesShowAll.open).toBe(false);
});

test("jumping to a main station opens nothing, and an unknown station is a no-op", () => {
  expect(revealStation("station-chase-grill", page)).toBe(grill);
  expect(grillShowAll.open).toBe(false);
  expect(revealStation("station-chase-nowhere", page)).toBeNull();
});
