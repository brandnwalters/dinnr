// UI smoke tests: the app navigation (tab bar / top nav) and its current-tab state.
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { AppNav } from "./app-nav";

/** The opening tag of the element whose text is `label`, e.g. `<a href="/me" aria-current="page" ...>`. */
function tabTag(html: string, label: string): string {
  const end = html.indexOf(`>${label}<`);
  const tags = html.slice(0, end).match(/<(a|span)\b[^>]*>/g) ?? [];
  // The label sits in its own span inside the tab: the tab is the last <a> or role="link" span before it.
  return tags.filter((tag) => tag.startsWith("<a") || tag.includes('role="link"')).at(-1) ?? "";
}

test("lists Today, Menus, Combos and Me", () => {
  const html = renderToStaticMarkup(<AppNav pathname="/" />);
  for (const label of ["Today", "Menus", "Combos", "Me"]) expect(html).toContain(`>${label}<`);
});

test("marks the current tab with aria-current, and only that tab", () => {
  const html = renderToStaticMarkup(<AppNav pathname="/me" />);
  expect(tabTag(html, "Me")).toContain('href="/me"');
  expect(tabTag(html, "Me")).toContain('aria-current="page"');
  expect(tabTag(html, "Today")).toContain('href="/"');
  expect(tabTag(html, "Today")).not.toContain("aria-current");
  expect(html.match(/aria-current/g)).toHaveLength(1);
});

test("Today is current on the home page", () => {
  const html = renderToStaticMarkup(<AppNav pathname="/" />);
  expect(tabTag(html, "Today")).toContain('aria-current="page"');
  expect(tabTag(html, "Me")).not.toContain("aria-current");
});

test("Menus links to /menus and is current there", () => {
  const html = renderToStaticMarkup(<AppNav pathname="/menus" />);
  expect(tabTag(html, "Menus")).toContain('href="/menus"');
  expect(tabTag(html, "Menus")).toContain('aria-current="page"');
  expect(html.match(/aria-current/g)).toHaveLength(1);
});

test("Combos is disabled: no link, announced as unavailable", () => {
  const html = renderToStaticMarkup(<AppNav pathname="/" />);
  const tag = tabTag(html, "Combos");
  expect(tag).toContain('aria-disabled="true"');
  expect(tag).not.toContain("href");
  expect(html).toContain("coming soon");
});

test("the navigation is labelled", () => {
  expect(renderToStaticMarkup(<AppNav pathname="/" />)).toMatch(/<nav[^>]*aria-label="Main"/);
});
