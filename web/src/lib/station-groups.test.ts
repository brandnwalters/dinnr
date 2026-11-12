// Station grouping: main stations, then bars, then Extras, each station's collapsed preview on Menus, and the Today card preview.
import { expect, test } from "vitest";
import type { MenuItem, Station } from "./today";
import { groupStations, stationKind, stationPreview, todayPreview } from "./station-groups";

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

/** A Today card preview as text, one string per line, to compare with a worked example. */
const lines = (stations: Station[]) =>
  todayPreview(stations).map((line) =>
    line.kind === "bar"
      ? `${line.station.name} · ${line.count} items`
      : `${line.station.name}: ${line.shown.map((i) => i.name).join(", ")}${line.more ? ` +${line.more} more` : ""}`,
  );

test("the Today preview lists main stations only, never Extras", () => {
  expect(
    lines([
      station("Condiments and Spreads", ["Ketchup"], true),
      station("Grill", ["Burger"]),
      station("Beverages", ["Milk"], true),
      station("Pasta", ["Penne"]),
    ]),
  ).toEqual(["Grill: Burger", "Pasta: Penne"]);
});

test("bars on the Today preview are one-line summaries with their item count, after the main stations", () => {
  expect(
    lines([
      station("Salad Bar", ["Lettuce", "Tomato", "Cucumber", "Croutons"]),
      station("Grill", ["Burger", "Fries", "Hot Dog", "Wings"]),
      station("Waffle Bar", ["Waffle", "Syrup"]),
    ]),
  ).toEqual(["Grill: Burger, Fries, Hot Dog +1 more", "Salad Bar · 4 items", "Waffle Bar · 2 items"]);
});

test("the Today preview is capped at five lines, main stations before bars", () => {
  expect(
    lines([
      station("Salad Bar", ["Lettuce", "Tomato"]),
      station("Grill", ["Burger"]),
      station("Pasta", ["Penne"]),
      station("Wok", ["Lo Mein"]),
      station("Pizza", ["Cheese Pizza"]),
      station("Waffle Bar", ["Waffle", "Syrup"]),
      station("Deli", ["Turkey Club"]),
      station("Soup", ["Tomato Soup"]),
    ]),
  ).toEqual(["Grill: Burger", "Pasta: Penne", "Wok: Lo Mein", "Pizza: Cheese Pizza", "Deli: Turkey Club"]);
  expect(
    lines([
      station("Grill", ["Burger"]),
      station("Salad Bar", ["Lettuce", "Tomato"]),
      station("Pasta", ["Penne"]),
      station("Waffle Bar", ["Waffle", "Syrup"]),
      station("Ice Cream Bar", ["Vanilla", "Sprinkles"]),
      station("Wok", ["Lo Mein"]),
    ]),
  ).toEqual(["Grill: Burger", "Pasta: Penne", "Wok: Lo Mein", "Salad Bar · 2 items", "Waffle Bar · 2 items"]);
});
