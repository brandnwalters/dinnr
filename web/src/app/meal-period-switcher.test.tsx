// UI smoke tests: the shared meal-period switcher (its options, links and current state) and "Not serving".
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MealPeriodSwitcher, NotServing } from "./meal-period-switcher";

/** The opening `<a>` tag of the option labelled `label`. */
function optionTag(html: string, label: string): string {
  return html.slice(0, html.indexOf(`>${label}<`) + 1).match(/<a\b[^>]*>/g)?.at(-1) ?? "";
}

const render = (selected: string | null, query: Record<string, string> = {}) =>
  renderToStaticMarkup(
    <MealPeriodSwitcher mealPeriods={["Breakfast", "Lunch", "Late Lunch", "Dinner"]} selected={selected} query={query} />,
  );

test("lists each meal period, in order, as a labelled control", () => {
  const html = render("Lunch");
  expect(html).toMatch(/<nav[^>]*aria-label="Meal period"/);
  const positions = ["Breakfast", "Lunch", "Late Lunch", "Dinner"].map((label) => html.indexOf(`>${label}<`));
  expect(positions.every((p) => p >= 0)).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
});

test("each option links to its meal period, keeping the other query parameters", () => {
  const html = render("Lunch", { hall: "chase" });
  expect(optionTag(html, "Late Lunch")).toContain('href="?hall=chase&amp;meal=Late+Lunch"');
  expect(optionTag(html, "Dinner")).toContain('href="?hall=chase&amp;meal=Dinner"');
});

test("the selected meal period is announced as current, and only that one", () => {
  const html = render("Late Lunch");
  expect(optionTag(html, "Late Lunch")).toContain('aria-current="true"');
  expect(optionTag(html, "Lunch")).not.toContain("aria-current");
  expect(html.match(/aria-current/g)).toHaveLength(1);
});

test("with no meal periods today there's no switcher", () => {
  expect(renderToStaticMarkup(<MealPeriodSwitcher mealPeriods={[]} selected={null} query={{}} />)).toBe("");
});

test("a hall that doesn't serve the selected meal period says so", () => {
  expect(renderToStaticMarkup(<NotServing mealPeriod="Late Lunch" />)).toContain("Not serving Late Lunch");
});
