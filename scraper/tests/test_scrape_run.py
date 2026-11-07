"""Seam 1: one scraper run against saved fixture pages, checked through the database."""

from datetime import date

from dinnr.locations import LOCATIONS
from dinnr.run import scrape
from dinnr.testing import FakeFetcher

TODAY = date(2026, 11, 7)  # the day the real fixtures were captured
LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"


def lenoir_menu(db):
    """(meal period, station, item name, recipe id) rows for Lenoir on TODAY, in page order."""
    return db.execute(
        """
        select mp.name, s.name, mi.name, mi.recipe_id
        from menu_item mi
        join meal_period mp on mp.id = mi.meal_period_id
        join menu_day md on md.id = mp.menu_day_id
        join location l on l.id = md.location_id
        join station s on s.id = mi.station_id
        where l.slug = 'top-of-lenoir' and md.date = %s
        order by mp.position, mi.position
        """,
        (TODAY,),
    ).fetchall()


def test_a_run_saves_lenoirs_meal_periods_stations_and_items(db, clean_db):
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html"})

    scrape(db, fetcher, LOCATIONS, today=TODAY)

    rows = lenoir_menu(db)
    # Fixture README: Continental + Brunch, 348 items in total.
    assert len(rows) == 348
    assert list(dict.fromkeys(r[0] for r in rows)) == ["Continental", "Brunch"]
    assert rows[0] == ("Continental", "Waffle Bar", "Waffle", 8260)
    assert ("Brunch", "The Grill", "Nashville Hot Chicken Biscuit", 15469) in rows
    # The same recipe can be served at two stations in one meal period.
    assert ("Brunch", "Waffle Bar", "Pancake Syrup", 10329) in rows
    assert ("Brunch", "Plant Forward", "Pancake Syrup", 10329) in rows
    brunch_stations = list(dict.fromkeys(r[1] for r in rows if r[0] == "Brunch"))
    assert brunch_stations[:3] == ["Waffle Bar", "The Kitchen Table", "Ice Cream Bar"]
    assert len(brunch_stations) == 17


def test_running_twice_on_the_same_day_updates_rows_instead_of_duplicating(db, clean_db):
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html"})

    scrape(db, fetcher, LOCATIONS, today=TODAY)
    first = lenoir_menu(db)
    scrape(db, fetcher, LOCATIONS, today=TODAY)

    assert lenoir_menu(db) == first
    assert db.execute("select count(*) from menu_day").fetchone() == (1,)
    assert db.execute("select count(*) from location").fetchone() == (1,)


def test_a_later_run_the_same_day_replaces_a_changed_menu(db, clean_db):
    scrape(db, FakeFetcher({LENOIR_URL: "top-of-lenoir.html"}), LOCATIONS, today=TODAY)

    # Midday the page changes: now Breakfast / Lunch / Dinner (weekday fixture).
    scrape(db, FakeFetcher({LENOIR_URL: "weekday-top-of-lenoir.html"}), LOCATIONS, today=TODAY)

    rows = lenoir_menu(db)
    assert list(dict.fromkeys(r[0] for r in rows)) == ["Breakfast", "Lunch", "Dinner"]
    # Fixture README: Lenoir Continental + Lenoir Brunch + Chase's real Dinner = 120 + 228 + 265.
    assert len(rows) == 613


def test_each_day_gets_its_own_menu(db, clean_db):
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html"})

    scrape(db, fetcher, LOCATIONS, today=TODAY)
    scrape(db, fetcher, LOCATIONS, today=date(2026, 11, 8))

    assert db.execute("select date from menu_day order by date").fetchall() == [
        (date(2026, 11, 7),),
        (date(2026, 11, 8),),
    ]
    assert len(lenoir_menu(db)) == 348


def test_a_run_requests_only_the_location_pages_and_recipe_nutrition(db, clean_db):
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html"})

    scrape(db, fetcher, LOCATIONS, today=TODAY)

    assert fetcher.requested[0] == LENOIR_URL
    recipe_prefix = "https://dining.unc.edu/wp-content/themes/nmc_dining/ajax-content/recipe.php?recipe="
    assert all(url.startswith(recipe_prefix) for url in fetcher.requested[1:])
