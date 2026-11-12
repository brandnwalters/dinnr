// Station grouping on Menus: main stations, then bars, then Extras, and each station's collapsed preview.
import { expect, test } from "vitest";
import type { MenuItem, Station } from "./today";
import { groupStations, stationKind, stationPreview } from "./station-groups";

let nextRecipeId = 1;
const item = (name: string, favorite = false): MenuItem => ({
  name,
  recipeId: nextRecipeId++,
  normalizedName: name.toLowerCase(),
  favorite,
  dietaryTags: [],
  allergens: [],
});

const station = (name: string, items: (string | MenuItem)[], excludedFromCombos = false): Station => ({
  name,
  ...(excludedFromCombos ? { excludedFromCombos: true as const } : {}),
  items: items.map((i) => (typeof i === "string" ? item(i) : i)),
});

const names = (stations: Station[]) => stations.map((s) => s.name);

test("a station is a bar when its name has the word bar, in any case", () => {
  expect(stationKind(station("Salad Bar", ["Lettuce"]))).toBe("bar");
  expect(stationKind(station("WAFFLE BAR", ["Waffle"]))).toBe("bar");
  expect(stationKind(station("bar of the day", ["Taco"]))).toBe("bar");
  expect(stationKind(station("Barbecue Pit", ["Brisket"]))).toBe("main");
  expect(stationKind(station("Grill", ["Burger"]))).toBe("main");
});

test("a station the scraper flags as excluded from combos is an extra, even if its name says bar", () => {
  expect(stationKind(station("Condiments and Spreads", ["Ketchup"], true))).toBe("extra");
  expect(stationKind(station("Coffee Bar", ["Coffee"], true))).toBe("extra");
});

test("stations group into main stations, then bars, then Extras, each kept in page order", () => {
  const groups = groupStations([
    station("Beverages", ["Milk"], true),
    station("Salad Bar", ["Lettuce"]),
    station("Grill", ["Burger"]),
    station("Cereal", ["Cheerios"], true),
    station("Waffle Bar", ["Waffle"]),
    station("Pasta", ["Penne"]),
  ]);
  expect(names(groups.main)).toEqual(["Grill", "Pasta"]);
  expect(names(groups.bars)).toEqual(["Salad Bar", "Waffle Bar"]);
  expect(names(groups.extras)).toEqual(["Beverages", "Cereal"]);
});

test("stations the filters emptied are left out, and so is a group with nothing left", () => {
  const groups = groupStations([
    station("Grill", ["Burger"]),
    station("Pasta", []),
    station("Salad Bar", []),
    station("Beverages", [], true),
  ]);
  expect(names(groups.main)).toEqual(["Grill"]);
  expect(groups.bars).toEqual([]);
  expect(groups.extras).toEqual([]);
});

test("a long station previews its first three dishes in page order, with the rest counted for Show all", () => {
  const preview = stationPreview(station("Grill", ["Burger", "Fries", "Hot Dog", "Onion Rings", "Veggie Burger"]));
  expect(preview.shown.map((i) => i.name)).toEqual(["Burger", "Fries", "Hot Dog"]);
  expect(preview.rest.map((i) => i.name)).toEqual(["Onion Rings", "Veggie Burger"]);
});

test("favorites move to the front of the preview, then the other dishes in page order", () => {
  const preview = stationPreview(
    station("Grill", ["Burger", "Fries", "Hot Dog", item("Onion Rings", true), "Wings", item("Veggie Burger", true)]),
  );
  expect(preview.shown.map((i) => i.name)).toEqual(["Onion Rings", "Veggie Burger", "Burger"]);
  expect(preview.rest.map((i) => i.name)).toEqual(["Fries", "Hot Dog", "Wings"]);
});

test("a station with more favorites than the preview holds shows its first favorites and keeps the rest", () => {
  const preview = stationPreview(
    station("Grill", [item("A", true), "B", item("C", true), item("D", true), item("E", true)]),
  );
  expect(preview.shown.map((i) => i.name)).toEqual(["A", "C", "D"]);
  expect(preview.rest.map((i) => i.name)).toEqual(["B", "E"]);
});

test("a station with three or fewer dishes shows them all with nothing left for Show all", () => {
  expect(stationPreview(station("Grill", ["Burger", "Fries", "Hot Dog"])).rest).toEqual([]);
  expect(stationPreview(station("Grill", ["Burger"])).shown.map((i) => i.name)).toEqual(["Burger"]);
});

test("the preview can keep page order and show a different number of dishes", () => {
  const preview = stationPreview(station("Grill", ["Burger", item("Fries", true), "Hot Dog"]), {
    limit: 1,
    favoritesFirst: false,
  });
  expect(preview.shown.map((i) => i.name)).toEqual(["Burger"]);
  expect(preview.rest.map((i) => i.name)).toEqual(["Fries", "Hot Dog"]);
});
