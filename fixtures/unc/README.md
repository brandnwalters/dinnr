# UNC dining fixtures

Saved responses from `dining.unc.edu`, used by scraper tests instead of the live
site. Tests must never fetch from UNC.

## Real captures

Captured once on **Saturday 2026-11-07, about 14:09-14:11 EST**, by a single
human-paced run: one request at a time, 5-6 seconds apart, with the polite
User-Agent `dinnr/0.1.0 (+https://github.com/brandnwalters/dinnr; contact: bmwal@unc.edu)`.
robots.txt was checked first (it disallows `/*?date=*` and `/*?pg=*`); no
`?date=` URL was requested. Files are byte-for-byte what the server returned.

| File | Source URL | Notes |
| --- | --- | --- |
| `top-of-lenoir.html` | `https://dining.unc.edu/locations/top-of-lenoir/` | Weekend page: Continental (10am-11am), Brunch (11am-3pm). 348 items. |
| `chase.html` | `https://dining.unc.edu/locations/chase/` | Weekend page: Continental (9am-11am), Brunch (11am-3pm), Late Lunch (3pm-5pm), Dinner (5pm-8pm). 888 items. |
| `recipes/recipe-13708.json` | `.../wp-content/themes/nmc_dining/ajax-content/recipe.php?recipe=13708` | Chicken Breast (4 oz, 140 cal, 25 g protein) |
| `recipes/recipe-14169.json` | `...recipe.php?recipe=14169` | Buttermilk Pancake |
| `recipes/recipe-6650.json` | `...recipe.php?recipe=6650` | Whole Milk (a Beverages-type item) |
| `recipes/recipe-8039.json` | `...recipe.php?recipe=8039` | Mini Donuts (several allergens) |

`recipe.php` returns JSON `{"success": ..., "html": "<nutrition label fragment>"}`.
The site's own JS also adds `&hide_allergens=0`; we requested only `?recipe=<id>`.

## Hand-crafted pages

The capture day was a Saturday, and other days can only be reached through
`?date=` URLs, which robots.txt disallows. No closed day was available either.
So these two are **derived from the real captures** by `derive_handcrafted.py`
(offline; rerun it if the captures change). Each starts with a
`HAND-CRAFTED` HTML comment.

| File | How it was made |
| --- | --- |
| `weekday-top-of-lenoir.html` | Real Lenoir page with the meal tabs replaced by Breakfast (7am-10:30am), Lunch (11am-3pm), Dinner (5pm-8pm). Panels are real: Lenoir Continental, Lenoir Brunch, Chase Dinner. Hours are made up. |
| `closed-top-of-lenoir.html` | Real Lenoir page with the whole `#menu-tabs` block removed, so it has no meal periods (the spec's definition of closed). What UNC really shows on a closed day is unknown. |

If a real weekday or closed page is captured later (on that day, from the plain
location URL), prefer it over these.
