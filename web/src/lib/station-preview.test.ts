// The condensed station preview on Today's hall cards: the first few dish names and a "+N more" count.
import { expect, test } from "vitest";
import type { MenuItem, Station } from "./today";
import { stationPreview } from "./station-preview";

const station = (...names: string[]): Station => ({
  name: "Grill",
  items: names.map(
    (name, i): MenuItem => ({
      name,
      recipeId: i + 1,
      normalizedName: name.toLowerCase(),
      favorite: false,
      dietaryTags: [],
      allergens: [],
    }),
  ),
});

test("a long station shows its first three dishes in menu order and counts the rest", () => {
  expect(stationPreview(station("Burger", "Fries", "Hot Dog", "Onion Rings", "Veggie Burger"))).toEqual({
    names: ["Burger", "Fries", "Hot Dog"],
    more: 2,
  });
});

test("a short station shows every dish with nothing more", () => {
  expect(stationPreview(station("Burger", "Fries"))).toEqual({ names: ["Burger", "Fries"], more: 0 });
  expect(stationPreview(station("Burger", "Fries", "Hot Dog"))).toEqual({
    names: ["Burger", "Fries", "Hot Dog"],
    more: 0,
  });
});

test("the number of dishes shown can be changed", () => {
  expect(stationPreview(station("Burger", "Fries", "Hot Dog"), 1)).toEqual({ names: ["Burger"], more: 2 });
});
