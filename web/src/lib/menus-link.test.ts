// The Menus deep-link builder: hall + meal period + station -> a Menus URL that lands on that station.
import { expect, test } from "vitest";
import { menusHref, stationAnchorId } from "./menus-link";

test("a deep link names the hall and meal period and jumps to the station's anchor", () => {
  expect(menusHref({ hall: "top-of-lenoir", meal: "Lunch", station: "Grill" })).toBe(
    "/menus?hall=top-of-lenoir&meal=Lunch#station-top-of-lenoir-grill",
  );
});

test("meal-period names and station names are made URL-safe", () => {
  const href = menusHref({ hall: "chase", meal: "Late Lunch", station: "Simply Prepared & Grill" });
  expect(href).toBe("/menus?hall=chase&meal=Late+Lunch#station-chase-simply-prepared-grill");
  expect(new URL(href, "https://dinnr.test").searchParams.get("meal")).toBe("Late Lunch");
});

test("the meal period and station are optional", () => {
  expect(menusHref({ hall: "chase" })).toBe("/menus?hall=chase");
  expect(menusHref({ hall: "chase", meal: "Dinner" })).toBe("/menus?hall=chase&meal=Dinner");
  expect(menusHref({ hall: "chase", station: "Wok" })).toBe("/menus?hall=chase#station-chase-wok");
});

test("the fragment is the id the Menus screen gives that hall's station", () => {
  expect(menusHref({ hall: "chase", meal: "Dinner", station: "Wok" })).toMatch(
    new RegExp(`#${stationAnchorId("chase", "Wok")}$`),
  );
});

test("the same station name in two halls gets two different anchors", () => {
  expect(stationAnchorId("chase", "Grill")).not.toBe(stationAnchorId("top-of-lenoir", "Grill"));
});

test("accented or punctuation-only station names still give a usable id", () => {
  expect(stationAnchorId("chase", "Café Crêpes")).toBe("station-chase-cafe-crepes");
  expect(stationAnchorId("chase", "***")).toMatch(/^station-chase-[\w-]+$/);
});
