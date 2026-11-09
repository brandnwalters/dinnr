// UI smoke tests: the Me screen lists favorites (each with unstar), the Appearance setting and the About notes; its loading skeleton.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { MeScreen, MeSkeleton } from "./me-screen";

const favorites = [
  { normalizedName: "grilled chicken breast", name: "Grilled Chicken Breast" },
  { normalizedName: "waffle", name: "Waffle" },
];

test("lists each favorite by name with an unstar button", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={favorites} theme="system" />);

  expect(html).toContain("My favorites");
  expect(html).toContain("Grilled Chicken Breast");
  expect(html).toContain('aria-label="Unstar Grilled Chicken Breast"');
  expect(html).toContain('aria-label="Unstar Waffle"');
});

test("with no favorites, says how to add one", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} theme="system" />);
  expect(html).toContain("No favorites yet");
  expect(html).not.toContain("Unstar");
});

test("About explains the data source, cross-contact and on-device storage", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} theme="system" />);

  expect(html).toContain("About");
  expect(html).toContain("UNC Dining");
  expect(html).toMatch(/allergen filters rely on UNC Dining&#x27;s labels/i);
  expect(html).toContain("cross-contact");
  expect(html).toContain("saved on this device only");
});

test("Appearance offers System, Light and Dark and exposes the current choice", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} theme="dark" />);

  expect(html).toContain("Appearance");
  expect(html).toMatch(/role="radiogroup"[^>]*aria-label="Appearance"/);
  for (const [label, checked] of [
    ["System", "false"],
    ["Light", "false"],
    ["Dark", "true"],
  ]) {
    expect(html).toMatch(new RegExp(`role="radio" aria-checked="${checked}"[^>]*>${label}<`));
  }
});

test("System is the choice shown when the device has no theme saved", () => {
  const html = renderToStaticMarkup(<MeScreen favorites={[]} theme="system" />);
  expect(html).toMatch(/role="radio" aria-checked="true"[^>]*>System</);
});

test("while preferences load, skeleton placeholders announce loading instead of the cards", () => {
  const html = renderToStaticMarkup(<MeSkeleton />);

  expect(html).toMatch(/<div[^>]*role="status"/);
  expect(html).toContain("Loading your favorites and settings");
  expect(html).not.toContain("My favorites");
});
