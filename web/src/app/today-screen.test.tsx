// UI smoke tests: Today's head-to-head hall cards (status pill, hours, favorites, trimmed preview, deep links) and the favorites strip.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import type { Hall, HallStatus, MealPeriod, MenuItem } from "@/lib/today";
import { TodayScreen } from "./today-screen";

const item = (name: string, recipeId: number, favorite = false): MenuItem => ({
  name,
  recipeId,
  normalizedName: name.toLowerCase(),
  favorite,
  dietaryTags: [],
  allergens: [],
});

const meal = (name: string, start: string, end: string, stations: MealPeriod["stations"]): MealPeriod => ({
  name,
  start,
  end,
  stations,
  favorites: stations.flatMap((s) => s.items.filter((i) => i.favorite).map((i) => ({ station: s.name, item: i }))),
});

const lenoir: Hall = {
  slug: "top-of-lenoir",
  name: "Top of Lenoir",
  status: "serving",
  currentMealPeriod: "Brunch",
  selectedMealPeriod: "Brunch",
  favoriteCount: 1,
  usualHours: [],
  mealPeriods: [
    meal("Brunch", "10:30", "15:00", [
      {
        name: "The Grill",
        items: [
          item("Buttermilk Pancake", 1),
          item("Scrambled Eggs", 2),
          item("Bacon", 3),
          item("Hash Browns", 4),
          item("Grits", 5),
        ],
      },
      { name: "Simply Prepared & Grill", items: [item("Grilled Chicken Breast", 6, true), item("Rice", 7)] },
    ]),
    meal("Dinner", "17:00", "20:00", [{ name: "The Grill", items: [item("Cheeseburger", 8)] }]),
  ],
};

const chase: Hall = {
  slug: "chase",
  name: "Chase",
  status: "opens-later",
  currentMealPeriod: "Late Lunch",
  selectedMealPeriod: "Late Lunch",
  favoriteCount: 0,
  usualHours: [],
  mealPeriods: [
    meal("Late Lunch", "14:00", "16:30", [{ name: "Deli", items: [item("Turkey Club", 9)] }]),
    meal("Dinner", "17:00", "21:00", [{ name: "Wok", items: [item("Lo Mein", 10)] }]),
  ],
};

const render = (halls: Hall[] = [lenoir, chase], query: { meal?: string } = {}, hasFavorites = true) =>
  renderToStaticMarkup(<TodayScreen halls={halls} query={query} hasFavorites={hasFavorites} />);

/** One hall's card: from its heading to the next card's heading. */
function card(html: string, hall: string): string {
  const start = html.indexOf(`>${hall}</h2>`);
  const end = html.indexOf("</h2>", start + hall.length + 6);
  return html.slice(start, end === -1 ? undefined : end);
}

/** The opening `<a>` tag of the link whose text is `text`. */
function linkTag(html: string, text: string): string {
  return html.slice(0, html.indexOf(`>${text}<`) + 1).match(/<a\b[^>]*>/g)?.at(-1) ?? "";
}

const withStatus = (status: HallStatus, current: string | null = null): Hall => ({
  ...chase,
  status,
  currentMealPeriod: current,
});

test("the status pill keeps today's wording for every hall status", () => {
  const cases: [Hall, string][] = [
    [lenoir, "Open now: Brunch until 3pm"],
    [chase, "Late Lunch starts at 2pm"],
    [withStatus("done-for-today"), "Closed for the rest of today"],
    [{ ...withStatus("closed-today"), mealPeriods: [] }, "Closed today"],
    [{ ...withStatus("no-menu"), mealPeriods: [] }, "No menu for today yet"],
  ];
  for (const [hall, wording] of cases) expect(card(render([hall]), hall.name)).toContain(wording);
});

test("one shared meal-period switcher drives every card, which shows that meal period's hours", () => {
  const html = render();
  expect(html.match(/aria-label="Meal period"/g)).toHaveLength(1);
  expect(card(html, "Top of Lenoir")).toContain("Brunch · 10:30am–3pm");
  const dinner = render([lenoir, chase], { meal: "Dinner" });
  expect(card(dinner, "Top of Lenoir")).toContain("Dinner · 5pm–8pm");
  expect(card(dinner, "Chase")).toContain("Dinner · 5pm–9pm");
  expect(card(dinner, "Top of Lenoir")).not.toContain("Pancake");
});

test("a hall that doesn't serve the selected meal period says so", () => {
  const html = render([lenoir, chase], { meal: "Late Lunch" });
  expect(card(html, "Top of Lenoir")).toContain("Not serving Late Lunch");
  expect(card(html, "Top of Lenoir")).not.toContain("See full menu");
  expect(card(html, "Chase")).not.toContain("Not serving");
  expect(card(html, "Chase")).toContain("Late Lunch · 2pm–4:30pm");
});

test("each card lists the user's favorites served there, each with its station", () => {
  const html = render();
  const lenoirCard = card(html, "Top of Lenoir");
  const favorites = lenoirCard.slice(lenoirCard.indexOf("Your favorites here"));
  expect(lenoirCard).toContain("Your favorites here");
  expect(favorites).toMatch(/Grilled Chicken Breast.*Simply Prepared &amp; Grill/);
  expect(card(html, "Chase")).not.toContain("Your favorites here");
  expect(html).not.toContain("Star dishes");
});

test("a student with no favorites gets a hint to star dishes instead", () => {
  const unstarred = (hall: Hall): Hall => ({
    ...hall,
    favoriteCount: 0,
    mealPeriods: hall.mealPeriods.map((mp) => ({ ...mp, favorites: [] })),
  });
  const html = render([unstarred(lenoir), unstarred(chase)], { meal: "Dinner" }, false);
  expect(card(html, "Top of Lenoir")).toContain("Star dishes");
  expect(card(html, "Chase")).toContain("Star dishes");
  expect(html).not.toContain("Your favorites here");
});

test("each card previews one line per station: its first dishes and how many more", () => {
  const lenoirCard = card(render(), "Top of Lenoir");
  expect(lenoirCard).toMatch(/The Grill.*Buttermilk Pancake, Scrambled Eggs, Bacon.*\+2 more/);
  expect(lenoirCard).not.toContain("Hash Browns");
  const short = lenoirCard.slice(lenoirCard.lastIndexOf(">Simply Prepared &amp; Grill<"));
  expect(short).toMatch(/Grilled Chicken Breast, Rice/);
  expect(short).not.toContain("more");
});

test("a card's preview leaves Extras off and sums up each bar in one line that deep-links to it", () => {
  const brunch = lenoir.mealPeriods[0];
  const withExtras: Hall = {
    ...lenoir,
    mealPeriods: [
      {
        ...brunch,
        stations: [
          { name: "Beverages", excludedFromCombos: true, items: [item("Whole Milk", 20)] },
          { name: "Waffle Bar", items: [item("Belgian Waffle", 21), item("Maple Syrup", 22), item("Whipped Cream", 23)] },
          ...brunch.stations,
        ],
      },
    ],
  };
  const lenoirCard = card(render([withExtras]), "Top of Lenoir");
  expect(lenoirCard).not.toContain("Beverages");
  expect(lenoirCard).not.toContain("Whole Milk");
  expect(lenoirCard).toMatch(/Simply Prepared &amp; Grill.*Waffle Bar.*· 3 items/);
  expect(lenoirCard).not.toContain("Belgian Waffle");
  expect(linkTag(lenoirCard, "Waffle Bar")).toContain(
    'href="/menus?hall=top-of-lenoir&amp;meal=Brunch#station-top-of-lenoir-waffle-bar"',
  );
});

test("a card's preview stops at five stations, then See full menu", () => {
  const many = ["Grill", "Pasta", "Wok", "Pizza", "Deli", "Soup"].map((name, i) => ({
    name,
    items: [item(`${name} Special`, 30 + i)],
  }));
  const busy: Hall = { ...chase, mealPeriods: [meal("Late Lunch", "14:00", "16:30", many)] };
  const chaseCard = card(render([busy]), "Chase");
  expect(chaseCard).toContain("Deli Special");
  expect(chaseCard).not.toContain("Soup");
  expect(chaseCard.indexOf("Deli Special")).toBeLessThan(chaseCard.indexOf("See full menu"));
});

/** The favorites strip's text, or "" when it's hidden. */
function strip(html: string): string {
  const start = html.indexOf('aria-label="Favorites by hall"');
  if (start === -1) return "";
  return html.slice(html.indexOf(">", start) + 1, html.indexOf("</p>", start)).replace(/<[^>]*>/g, "");
}

test("a strip above the cards compares how many favorites each hall serves in the selected meal, most first", () => {
  const html = render();
  expect(strip(html)).toBe("Top of Lenoir has 1 of your favorites · Chase has 0");
  expect(html.indexOf('aria-label="Favorites by hall"')).toBeLessThan(html.indexOf(">Top of Lenoir</h2>"));

  const chaseFavorites: Hall = {
    ...chase,
    mealPeriods: [
      meal("Late Lunch", "14:00", "16:30", [
        { name: "Deli", items: [item("Turkey Club", 9, true), item("BLT", 11, true)] },
        { name: "Grill", items: [item("Turkey Club", 12, true), item("Fries", 13, true)] },
      ]),
      ...chase.mealPeriods.slice(1),
    ],
  };
  // Chase serves Late Lunch, Lenoir doesn't: 3 distinct favorites (Turkey Club twice) against 0.
  expect(strip(render([lenoir, chaseFavorites], { meal: "Late Lunch" }))).toBe(
    "Chase has 3 of your favorites · Top of Lenoir has 0",
  );
});

test("the favorites strip follows the meal period and is hidden when neither hall serves a favorite", () => {
  expect(strip(render([lenoir, chase], { meal: "Dinner" }))).toBe("");
  expect(strip(render([lenoir, chase], { meal: "Brunch" }))).not.toBe("");
  // Filters come in already applied to the menu: with the favorite filtered out, the strip goes too.
  const filtered: Hall = {
    ...lenoir,
    mealPeriods: lenoir.mealPeriods.map((mp) =>
      meal(
        mp.name,
        mp.start!,
        mp.end!,
        mp.stations.map((s) => ({ ...s, items: s.items.filter((i) => !i.favorite) })),
      ),
    ),
  };
  expect(strip(render([filtered, chase]))).toBe("");
});

test("each station deep-links into Menus at that station, for that hall and meal period", () => {
  const html = render([lenoir, chase], { meal: "Dinner" });
  expect(linkTag(card(html, "Chase"), "Wok")).toContain('href="/menus?hall=chase&amp;meal=Dinner#station-chase-wok"');
  const brunch = render();
  expect(linkTag(card(brunch, "Top of Lenoir"), "Simply Prepared &amp; Grill")).toContain(
    'href="/menus?hall=top-of-lenoir&amp;meal=Brunch#station-top-of-lenoir-simply-prepared-grill"',
  );
});

test("See full menu opens Menus for that hall and meal period", () => {
  const html = render([lenoir, chase], { meal: "Dinner" });
  expect(linkTag(card(html, "Top of Lenoir"), "See full menu")).toContain(
    'href="/menus?hall=top-of-lenoir&amp;meal=Dinner"',
  );
  expect(linkTag(card(html, "Chase"), "See full menu")).toContain('href="/menus?hall=chase&amp;meal=Dinner"');
});

test("a hall closed all day or with no menu yet gets a friendly state instead of a preview", () => {
  const closed: Hall = { ...withStatus("closed-today"), mealPeriods: [] };
  const closedCard = card(render([lenoir, closed]), "Chase");
  expect(closedCard).toContain("Closed all day");
  expect(closedCard).not.toContain("Not serving");
  expect(closedCard).not.toContain("See full menu");

  const noMenu: Hall = { ...withStatus("no-menu"), mealPeriods: [] };
  const noMenuCard = card(render([lenoir, noMenu]), "Chase");
  expect(noMenuCard).toContain("Check back later");
  expect(noMenuCard.match(/No menu for today yet/g)).toHaveLength(1); // the pill, not repeated below it  expect(noMenuCard).not.toContain("Not serving");
  expect(noMenuCard).not.toContain("See full menu");
});

test("when filters hide every dish in a hall's meal period, its card says so", () => {
  const filteredOut: Hall = { ...chase, mealPeriods: [meal("Late Lunch", "14:00", "16:30", [])] };
  const chaseCard = card(render([lenoir, filteredOut], { meal: "Late Lunch" }), "Chase");
  expect(chaseCard).toContain("No items match your filters");
  expect(chaseCard).not.toContain('aria-label="Chase stations"');
});

test("Today no longer renders the full menus", () => {
  const html = render();
  expect(html).not.toContain("Hash Browns");
  expect(html).not.toMatch(/aria-label="(Star|Unstar) /);
  expect(html).not.toContain("g protein");
});

test("each card's status pill and hours line open that hall's Usual hours", () => {
  const lenoirCard = card(render(), "Top of Lenoir");
  const triggers = lenoirCard.match(/<button[^>]*aria-haspopup="dialog"[^>]*>.*?<\/button>/g) ?? [];
  expect(triggers).toHaveLength(2);
  expect(triggers[0]).toContain("Open now: Brunch until 3pm");
  expect(triggers[1]).toContain("Brunch · 10:30am–3pm");
  for (const trigger of triggers) expect(trigger).toContain("Usual hours for Top of Lenoir");
});

describe("New today on the hall cards", () => {
  const isNew = (i: MenuItem): MenuItem => ({ ...i, newToday: true });
  const withNew: Hall = {
    ...lenoir,
    mealPeriods: [
      meal("Brunch", "10:30", "15:00", [
        { name: "The Grill", items: [item("Buttermilk Pancake", 1), isNew(item("Jerk Chicken", 2))] },
        { name: "Global", items: [isNew(item("Sushi Roll", 3)), isNew(item("Jerk Chicken", 4))] },
      ]),
      meal("Dinner", "17:00", "20:00", [{ name: "The Grill", items: [item("Cheeseburger", 8)] }]),
    ],
  };

  /** A card's New today list as text, or "" when it has none. */
  function newToday(cardHtml: string): string {
    const start = cardHtml.indexOf('aria-label="New today at');
    if (start === -1) return "";
    return cardHtml
      .slice(cardHtml.indexOf(">", start) + 1, cardHtml.indexOf("</ul>", start))
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ");
  }

  test("a card lists the selected meal's New today dishes once each, with their station", () => {
    const lenoirCard = card(render([withNew, chase]), "Top of Lenoir");
    const list = newToday(lenoirCard);
    expect(list).toContain("Jerk Chicken · The Grill");
    expect(list).toContain("Sushi Roll · Global");
    expect(list.match(/Jerk Chicken/g)).toHaveLength(1);
    expect(list).not.toContain("Buttermilk Pancake");
    expect(lenoirCard).toMatch(/>New today</);
  });

  test("a card leaves New today dishes from Extras stations off its list", () => {
    const withNewExtra: Hall = {
      ...lenoir,
      mealPeriods: [
        meal("Brunch", "10:30", "15:00", [
          { name: "The Grill", items: [isNew(item("Jerk Chicken", 2))] },
          { name: "Beverages", excludedFromCombos: true, items: [isNew(item("Mango Lassi", 5))] },
        ]),
      ],
    };
    const list = newToday(card(render([withNewExtra, chase]), "Top of Lenoir"));
    expect(list).toContain("Jerk Chicken · The Grill");
    expect(list).not.toContain("Mango Lassi");
  });

  test("a card whose only New today dishes are Extras shows no New today list", () => {
    const onlyExtra: Hall = {
      ...lenoir,
      mealPeriods: [
        meal("Brunch", "10:30", "15:00", [
          { name: "The Grill", items: [item("Buttermilk Pancake", 1)] },
          { name: "Beverages", excludedFromCombos: true, items: [isNew(item("Mango Lassi", 5))] },
        ]),
      ],
    };
    expect(card(render([onlyExtra, chase]), "Top of Lenoir")).not.toContain("New today");
  });

  test("a card with no New today dishes in the selected meal (after filters) shows nothing", () => {
    expect(card(render([withNew, chase], { meal: "Dinner" }), "Top of Lenoir")).not.toContain("New today");
    expect(card(render(), "Top of Lenoir")).not.toContain("New today");
  });

  test("the New today list takes one of the card's five lines, ahead of the station preview", () => {
    const many = ["Grill", "Pasta", "Wok", "Pizza", "Deli", "Soup"].map((name, i) => ({
      name,
      items: [item(`${name} Special`, 30 + i)],
    }));
    const busy: Hall = {
      ...chase,
      mealPeriods: [
        meal("Late Lunch", "14:00", "16:30", [
          { ...many[0], items: [...many[0].items, isNew(item("Jerk Chicken", 40)), isNew(item("Sushi Roll", 41))] },
          ...many.slice(1),
        ]),
      ],
    };
    const chaseCard = card(render([busy]), "Chase");
    expect(newToday(chaseCard)).toContain("Jerk Chicken");
    expect(chaseCard.indexOf("New today")).toBeLessThan(chaseCard.indexOf("Grill Special"));
    expect(chaseCard).toContain("Pizza Special");
    expect(chaseCard).not.toContain("Deli Special");
  });
});
