"""Seam 1: one scraper run against saved fixture pages, checked through the database."""

from datetime import date, time

from dinnr.locations import LOCATIONS
from dinnr.run import scrape
from dinnr.testing import FIXTURES_DIR, FakeFetcher

TODAY = date(2026, 11, 7)  # the day the real fixtures were captured
LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"
CHASE_URL = "https://dining.unc.edu/locations/chase/"
BOTH_HALLS = {LENOIR_URL: "top-of-lenoir.html", CHASE_URL: "chase.html"}


def hall_menu(db, slug):
    """(meal period, station, item name, recipe id) rows for one hall on TODAY, in page order."""
    return db.execute(
        """
        select mp.name, s.name, mi.name, mi.recipe_id
        from menu_item mi
        join meal_period mp on mp.id = mi.meal_period_id
        join menu_day md on md.id = mp.menu_day_id
        join location l on l.id = md.location_id
        join station s on s.id = mi.station_id
        where l.slug = %s and md.date = %s
        order by mp.position, mi.position
        """,
        (slug, TODAY),
    ).fetchall()


def lenoir_menu(db):
    return hall_menu(db, "top-of-lenoir")


def test_a_run_saves_lenoirs_meal_periods_stations_and_items(db, clean_db):
    fetcher = FakeFetcher(BOTH_HALLS)

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


def all_menu_rows(db):
    """Every menu row in the database, ids included (menu_day.scraped_at left out: it records the latest run)."""
    queries = {
        "location": "select id, slug, name, url from location order by id",
        "menu_day": "select id, location_id, date, status from menu_day order by id",
        "meal_period": "select id, menu_day_id, name, position, start_time, end_time from meal_period order by id",
        "station": "select id, name from station order by id",
        "menu_item": "select id, meal_period_id, station_id, recipe_id, name, position from menu_item order by id",
    }
    return {table: db.execute(query).fetchall() for table, query in queries.items()}


def test_running_twice_with_the_same_pages_leaves_the_same_rows_as_running_once(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)
    once = all_menu_rows(db)

    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    # Same rows with the same ids: updated in place, nothing duplicated or re-created.
    assert all_menu_rows(db) == once
    # Fixture README: Lenoir 348 + Chase 888 items.
    assert len(once["menu_item"]) == 348 + 888


def test_a_midday_run_adds_new_items_and_removes_ones_that_are_gone(db, clean_db, tmp_path):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)
    morning = lenoir_menu(db)
    chase_morning = hall_menu(db, "chase")

    # By midday the Continental Waffle Bar swapped its Waffle for a new dish. Only the first
    # "Waffle" on the page (Continental) changes; Brunch still serves one.
    page = (FIXTURES_DIR / "top-of-lenoir.html").read_text()
    waffle = 'data-recipe="8260" tabindex="0">Waffle</a>'
    assert page.count(waffle) == 2
    midday_page = tmp_path / "midday-top-of-lenoir.html"
    midday_page.write_text(page.replace(waffle, 'data-recipe="99999" tabindex="0">Midday Special</a>', 1))
    scrape(db, FakeFetcher({**BOTH_HALLS, LENOIR_URL: str(midday_page)}), LOCATIONS, today=TODAY)

    midday = lenoir_menu(db)
    assert ("Continental", "Waffle Bar", "Midday Special", 99999) in midday
    assert ("Continental", "Waffle Bar", "Waffle", 8260) not in midday
    assert ("Brunch", "Waffle Bar", "Waffle", 8260) in midday
    assert midday == [
        ("Continental", "Waffle Bar", "Midday Special", 99999) if row == ("Continental", "Waffle Bar", "Waffle", 8260)
        else row
        for row in morning
    ]
    assert hall_menu(db, "chase") == chase_morning
    assert db.execute("select count(*) from menu_day").fetchone() == (2,)


def test_a_later_run_the_same_day_replaces_a_changed_menu(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    # Midday the page changes: now Breakfast / Lunch / Dinner (weekday fixture).
    scrape(db, FakeFetcher({**BOTH_HALLS, LENOIR_URL: "weekday-top-of-lenoir.html"}), LOCATIONS, today=TODAY)

    rows = lenoir_menu(db)
    assert list(dict.fromkeys(r[0] for r in rows)) == ["Breakfast", "Lunch", "Dinner"]
    # Fixture README: Lenoir Continental + Lenoir Brunch + Chase's real Dinner = 120 + 228 + 265.
    assert len(rows) == 613


def test_each_day_gets_its_own_menu(db, clean_db):
    fetcher = FakeFetcher(BOTH_HALLS)

    scrape(db, fetcher, LOCATIONS, today=TODAY)
    scrape(db, fetcher, LOCATIONS, today=date(2026, 11, 8))

    assert db.execute("select distinct date from menu_day order by date").fetchall() == [
        (date(2026, 11, 7),),
        (date(2026, 11, 8),),
    ]
    assert len(lenoir_menu(db)) == 348


def test_a_run_requests_only_the_location_pages_and_recipe_nutrition(db, clean_db):
    fetcher = FakeFetcher(BOTH_HALLS)

    scrape(db, fetcher, LOCATIONS, today=TODAY)

    recipe_prefix = "https://dining.unc.edu/wp-content/themes/nmc_dining/ajax-content/recipe.php?recipe="
    assert fetcher.requested[0] == LENOIR_URL
    assert [url for url in fetcher.requested if not url.startswith(recipe_prefix)] == [LENOIR_URL, CHASE_URL]


def test_a_run_with_both_fixtures_saves_lenoir_and_chase(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    assert db.execute("select slug, name, url from location order by slug").fetchall() == [
        ("chase", "Chase", CHASE_URL),
        ("top-of-lenoir", "Top of Lenoir", LENOIR_URL),
    ]
    assert len(lenoir_menu(db)) == 348
    chase = hall_menu(db, "chase")
    # Fixture README: Chase is Continental / Brunch / Late Lunch / Dinner, 888 items.
    assert len(chase) == 888
    assert list(dict.fromkeys(r[0] for r in chase)) == ["Continental", "Brunch", "Late Lunch", "Dinner"]
    assert chase[0] == ("Continental", "Waffle Bar", "Waffle", 8260)


def hall_day(db, slug="top-of-lenoir", day=TODAY):
    """(status, [(meal period, start, end), ...]) for one hall on `day`."""
    status = db.execute(
        """
        select md.status from menu_day md join location l on l.id = md.location_id
        where l.slug = %s and md.date = %s
        """,
        (slug, day),
    ).fetchone()[0]
    meal_periods = db.execute(
        """
        select mp.name, mp.start_time, mp.end_time
        from meal_period mp
        join menu_day md on md.id = mp.menu_day_id
        join location l on l.id = md.location_id
        where l.slug = %s and md.date = %s
        order by mp.position
        """,
        (slug, day),
    ).fetchall()
    return status, meal_periods


def lenoir_day(db):
    return hall_day(db, "top-of-lenoir")


def with_lenoir(fixture):
    return FakeFetcher({**BOTH_HALLS, LENOIR_URL: fixture})


def test_meal_period_hours_are_parsed_from_the_weekday_tabs(db, clean_db):
    scrape(db, with_lenoir("weekday-top-of-lenoir.html"), LOCATIONS, today=TODAY)

    # Tabs: "Breakfast (7am-10:30am)", "Lunch (11am-3pm)", "Dinner (5pm-8pm)".
    assert lenoir_day(db) == (
        "open",
        [
            ("Breakfast", time(7, 0), time(10, 30)),
            ("Lunch", time(11, 0), time(15, 0)),
            ("Dinner", time(17, 0), time(20, 0)),
        ],
    )


def test_meal_period_hours_are_parsed_from_the_weekend_tabs(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    # Real tabs: "Continental  (10am-11am)" (two spaces), "Brunch (11am-3pm)".
    assert lenoir_day(db) == (
        "open",
        [("Continental", time(10, 0), time(11, 0)), ("Brunch", time(11, 0), time(15, 0))],
    )
    assert hall_day(db, "chase") == (
        "open",
        [
            ("Continental", time(9, 0), time(11, 0)),
            ("Brunch", time(11, 0), time(15, 0)),
            ("Late Lunch", time(15, 0), time(17, 0)),
            ("Dinner", time(17, 0), time(20, 0)),
        ],
    )


def test_a_page_with_no_meal_periods_is_saved_as_closed(db, clean_db):
    scrape(db, with_lenoir("closed-top-of-lenoir.html"), LOCATIONS, today=TODAY)

    assert lenoir_day(db) == ("closed", [])
    assert hall_day(db, "chase")[0] == "open"


def test_a_later_run_the_same_day_updates_open_closed_status(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)
    scrape(db, with_lenoir("closed-top-of-lenoir.html"), LOCATIONS, today=TODAY)

    assert lenoir_day(db) == ("closed", [])
    assert lenoir_menu(db) == []

    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    assert lenoir_day(db)[0] == "open"
