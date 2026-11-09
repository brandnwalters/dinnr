// Dietary tags: each tag's short, fixed abbreviation for the compact menu rows.
import { expect, test } from "vitest";
import { DIETARY_TAGS, dietaryTagAbbreviation } from "./dietary-tags";

test("every known tag has its fixed abbreviation", () => {
  expect(Object.fromEntries(DIETARY_TAGS.map((t) => [t.code, dietaryTagAbbreviation(t.code)]))).toEqual({
    vegan: "VG",
    vegetarian: "V",
    halal: "H",
    made_without_gluten: "GF",
    smart_choice: "SC",
    local: "L",
    organic: "O",
    sustainable_seafood: "SS",
    cool_foods: "CF",
  });
});

test("an unknown multi-word tag is abbreviated to its initials", () => {
  expect(dietaryTagAbbreviation("plant_forward")).toBe("PF");
  expect(dietaryTagAbbreviation("contains_no_pork")).toBe("CNP");
});

test("an unknown single-word tag is abbreviated to its first two letters", () => {
  expect(dietaryTagAbbreviation("kosher")).toBe("KO");
});

test("an unknown tag with odd characters still gets a short, non-empty abbreviation", () => {
  expect(dietaryTagAbbreviation("x")).toBe("X");
  expect(dietaryTagAbbreviation("__")).toBe("?");
});
