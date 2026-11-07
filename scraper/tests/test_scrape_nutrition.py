"""Seam 1: recipe nutrition saved by a scraper run, checked through the database and the fetcher."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from dinnr.locations import Location
from dinnr.nutrition import recipe_url
from dinnr.run import scrape
from dinnr.testing import FakeFetcher

TODAY = date(2026, 11, 7)
NOW = datetime(2026, 11, 7, 14, 0, tzinfo=UTC)

LENOIR = Location("top-of-lenoir", "Top of Lenoir", "https://dining.unc.edu/locations/top-of-lenoir/")
# Chase's real page serves all four recipe fixtures (Lenoir's has only 6650 and 8039).
CHASE = Location("chase", "Chase", "https://dining.unc.edu/locations/chase/")

RECIPE_FIXTURES = {recipe_url(rid): f"recipes/recipe-{rid}.json" for rid in (13708, 14169, 6650, 8039)}


def chase_fetcher(**kwargs) -> FakeFetcher:
    return FakeFetcher({CHASE.url: "chase.html", **RECIPE_FIXTURES}, **kwargs)


def nutrition(db, recipe_id: int) -> dict | None:
    cur = db.execute("select * from recipe_nutrition where recipe_id = %s", (recipe_id,))
    row = cur.fetchone()
    if row is None:
        return None
    return dict(zip([c.name for c in cur.description], row))


def recipe_requests(fetcher: FakeFetcher) -> list[str]:
    return [url for url in fetcher.requested if "recipe.php" in url]


def recipe_ids_on_menu(db, slug: str | None = None) -> set[int]:
    rows = db.execute(
        """
        select distinct mi.recipe_id
        from menu_item mi
        join meal_period mp on mp.id = mi.meal_period_id
        join menu_day md on md.id = mp.menu_day_id
        join location l on l.id = md.location_id
        where %(slug)s::text is null or l.slug = %(slug)s
        """,
        {"slug": slug},
    )
    return {r[0] for r in rows}


def test_a_run_saves_parsed_nutrition_for_the_recipes_on_the_menu(db, clean_db):
    scrape(db, chase_fetcher(), [CHASE], today=TODAY, now=NOW)

    # Fixture README: Chicken Breast, 4 oz, 140 cal, 25 g protein.
    assert nutrition(db, 13708) == {
        "recipe_id": 13708,
        "name": "Chicken Breast",
        "serving_size": "4 oz",
        "calories": Decimal("140"),
        "total_fat_g": Decimal("4"),
        "saturated_fat_g": Decimal("1.5"),
        "trans_fat_g": Decimal("0"),
        "cholesterol_mg": Decimal("65"),
        "sodium_mg": Decimal("40"),
        "total_carbohydrate_g": Decimal("0"),
        "dietary_fiber_g": Decimal("0"),
        "sugars_g": Decimal("0"),
        "added_sugar_g": Decimal("0"),
        "protein_g": Decimal("25"),
        "micronutrients": [
            {"name": "Calcium", "amount": 0, "unit": "mg"},
            {"name": "Iron", "amount": 1, "unit": "mg"},
            {"name": "Potassium", "amount": 0, "unit": "mg"},
            {"name": "Vitamin D", "amount": 0, "unit": "mcg"},
        ],
        "ingredients": "CHICKEN BREAST BNLS SKNLS 4 OZ FZ (Boneless, skinless chicken breast filets with rib meat)",
        "fetched_at": NOW,
    }
    pancake = nutrition(db, 14169)
    assert (pancake["serving_size"], pancake["calories"], pancake["protein_g"]) == ("1 pancakes", 80, 2)
    assert pancake["total_fat_g"] == Decimal("0.5")
    assert {"name": "Iron", "amount": 0.83, "unit": "mg"} in pancake["micronutrients"]
    assert pancake["ingredients"].startswith("WATER, MIX PANCAKE WAFFLE COMPLETE PEARL MILLING (ENRICHED")
    milk = nutrition(db, 6650)
    assert (milk["name"], milk["serving_size"], milk["calories"], milk["added_sugar_g"]) == (
        "Whole Milk",
        "1 cup",
        150,
        12,
    )
    assert {"name": "Vitamin D", "amount": 2.5, "unit": "mcg"} in milk["micronutrients"]
    assert milk["ingredients"] == "Maola® Whole Milk (Milk, Vitamin D3)"
    # The donut label also has a description and an allergen line before the ingredients.
    donuts = nutrition(db, 8039)
    assert (donuts["name"], donuts["serving_size"], donuts["dietary_fiber_g"]) == ("Mini Donuts", "1 each", Decimal("0.5"))
    assert donuts["ingredients"].startswith("DONUT YEAST GLAZED 2.5 OZ FZ (PLAIN DONUT:")


def test_every_recipe_on_the_menu_gets_nutrition_fetched_once(db, clean_db):
    fetcher = chase_fetcher()

    scrape(db, fetcher, [CHASE], today=TODAY, now=NOW)

    on_menu = recipe_ids_on_menu(db)
    # Chase lists some recipes several times (several meal periods / stations).
    assert db.execute("select count(*) from menu_item").fetchone()[0] > len(on_menu)
    assert sorted(recipe_requests(fetcher)) == sorted(recipe_url(rid) for rid in on_menu)
    assert db.execute("select count(*) from recipe_nutrition").fetchone() == (len(on_menu),)


def test_later_runs_within_30_days_fetch_no_nutrition(db, clean_db):
    scrape(db, chase_fetcher(), [CHASE], today=TODAY, now=NOW)

    same_day = chase_fetcher()
    scrape(db, same_day, [CHASE], today=TODAY, now=NOW + timedelta(hours=6))
    thirty_days_on = chase_fetcher()
    scrape(db, thirty_days_on, [CHASE], today=TODAY + timedelta(days=30), now=NOW + timedelta(days=30))

    assert same_day.requested == [CHASE.url]
    assert thirty_days_on.requested == [CHASE.url]
    assert nutrition(db, 13708)["fetched_at"] == NOW


def test_nutrition_older_than_30_days_is_fetched_again_and_replaced(db, clean_db):
    # First run: every recipe, 13708 included, is served the pancake label.
    pancakes_everywhere = FakeFetcher({CHASE.url: "chase.html"}, recipe_fallback="recipes/recipe-14169.json")
    scrape(db, pancakes_everywhere, [CHASE], today=TODAY, now=NOW)
    assert nutrition(db, 13708)["name"] == "Buttermilk Pancake"

    later = NOW + timedelta(days=31)
    fetcher = chase_fetcher()
    scrape(db, fetcher, [CHASE], today=TODAY + timedelta(days=31), now=later)

    assert sorted(recipe_requests(fetcher)) == sorted(recipe_url(rid) for rid in recipe_ids_on_menu(db))
    chicken = nutrition(db, 13708)
    assert (chicken["name"], chicken["calories"], chicken["fetched_at"]) == ("Chicken Breast", 140, later)


def test_a_second_hall_fetches_only_recipes_not_already_known(db, clean_db):
    scrape(db, FakeFetcher({LENOIR.url: "top-of-lenoir.html"}), [LENOIR], today=TODAY, now=NOW)

    fetcher = chase_fetcher()
    scrape(db, fetcher, [CHASE], today=TODAY, now=NOW + timedelta(days=1))

    lenoir, chase = recipe_ids_on_menu(db, "top-of-lenoir"), recipe_ids_on_menu(db, "chase")
    # Both halls serve Whole Milk (6650) and Mini Donuts (8039), already known after Lenoir's run.
    assert {6650, 8039} <= lenoir & chase
    assert sorted(recipe_requests(fetcher)) == sorted(recipe_url(rid) for rid in chase - lenoir)


def test_a_recipe_response_without_nutrition_is_skipped_and_retried_next_run(db, clean_db, tmp_path):
    broken = tmp_path / "recipe-broken.json"
    broken.write_text('{"success": false, "html": ""}')
    first = FakeFetcher({CHASE.url: "chase.html", recipe_url(13708): str(broken)})

    scrape(db, first, [CHASE], today=TODAY, now=NOW)

    assert recipe_url(13708) in first.requested
    assert nutrition(db, 13708) is None
    assert nutrition(db, 8039) is not None  # the rest of the run carried on

    retry = chase_fetcher()
    scrape(db, retry, [CHASE], today=TODAY, now=NOW + timedelta(hours=6))

    assert recipe_requests(retry) == [recipe_url(13708)]
    assert nutrition(db, 13708)["name"] == "Chicken Breast"
