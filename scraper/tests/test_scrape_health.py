"""Seam 1: health checks. A run whose pages look wrong fails, saying which hall and why.

These use small hand-made pages in the real page's shape (see menu_parser), each
showing TODAY in its date picker unless a test says otherwise, and
seed past days straight into the database, so they don't need full fixture runs.
"""

from datetime import UTC, date, datetime, timedelta

import pytest

from dinnr.cli import main
from dinnr.locations import LOCATIONS
from dinnr.run import ScrapeFailed, scrape
from dinnr.testing import FakeFetcher, page_timestamp
from test_scrape_run import CHASE_URL, LENOIR_URL, TODAY, hall_day, hall_menu

NOW = datetime(2026, 11, 7, 19, 0, tzinfo=UTC)  # 2pm in Chapel Hill on TODAY
LENOIR = next(loc for loc in LOCATIONS if loc.slug == "top-of-lenoir")


def date_picker(day: date) -> str:
    """The page's date picker, as on the real page: its timestamp is `day`'s midnight in Chapel Hill."""
    return (
        '<div id="location-date-calendar-picker" style="display: none;">'
        f'<input type="hidden" value="{page_timestamp(day)}" id="date-timestamp"></div>'
    )


def location_page(menu_tabs="", *, day=TODAY):
    """A location page showing `day` in its date picker; no date picker at all if `day` is None."""
    picker = date_picker(day) if day else ""
    return (
        f'<html><body><div id="single-location-wrap"><h1>Top of Lenoir</h1>{picker}{menu_tabs}</div>'
        "</body></html>"
    )


def menu_page(item_count, *, panel_id="tabinfo-1", day=TODAY):
    """A location page with one meal period (Lunch) and one station holding `item_count` items."""
    items = "".join(
        f'<li class="menu-item-li"><a class="show-nutrition" data-recipe="{900000 + n}">Dish {n}</a></li>'
        for n in range(item_count)
    )
    return location_page(
        '<div id="menu-tabs">'
        '<button role="tab" aria-controls="tabinfo-1">Lunch (11am-3pm)</button>'
        f'<div role="tabpanel" id="{panel_id}"><div class="menu-station">'
        f'<button class="toggle-menu-station-data">The Grill</button><ul>{items}</ul>'
        "</div></div></div>",
        day=day,
    )


def page_file(tmp_path, name, html):
    path = tmp_path / name
    path.write_text(html)
    return str(path)


def scrape_lenoir(db, tmp_path, html):
    """Scrape only Lenoir, serving it `html`."""
    fetcher = FakeFetcher({LENOIR_URL: page_file(tmp_path, "lenoir.html", html)})
    scrape(db, fetcher, [LENOIR], now=NOW)


# TODAY is Saturday 2026-11-07.
WEEKDAYS_BEFORE = [TODAY - timedelta(days=n) for n in (5, 4, 3, 2, 1)]  # Mon 2 .. Fri 6 Nov
WEEKENDS_BEFORE = [TODAY - timedelta(days=n) for n in (14, 13, 7, 6)]  # Sat 24 Oct .. Sun 1 Nov
NEXT_MONDAY = TODAY + timedelta(days=2)


def days(dates, counts):
    return dict(zip(dates, counts, strict=True))


def seed_open_days(db, counts_by_date):
    """Lenoir open on these past days ({date: item count})."""
    location_id = db.execute(
        "insert into location (slug, name, url) values (%s, %s, %s) returning id",
        (LENOIR.slug, LENOIR.name, LENOIR.url),
    ).fetchone()[0]
    station_id = db.execute("insert into station (name) values ('Seeded') returning id").fetchone()[0]
    for day, count in counts_by_date.items():
        menu_day_id = db.execute(
            "insert into menu_day (location_id, date, status) values (%s, %s, 'open') returning id",
            (location_id, day),
        ).fetchone()[0]
        meal_period_id = db.execute(
            "insert into meal_period (menu_day_id, name, position) values (%s, 'Lunch', 0) returning id",
            (menu_day_id,),
        ).fetchone()[0]
        db.execute(
            """
            insert into menu_item (meal_period_id, station_id, recipe_id, name, position, normalized_name)
            select %s, %s, n, 'Seeded ' || n, n, 'seeded ' || n from generate_series(1, %s) n
            """,
            (meal_period_id, station_id, count),
        )
    db.commit()


def test_an_open_day_with_no_items_fails_the_run(db, clean_db, tmp_path):
    # Meal period tab and station are there, but no items.
    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: .*no menu items"):
        scrape_lenoir(db, tmp_path, menu_page(0))


def test_an_item_count_under_half_of_recent_normal_fails_the_run(db, clean_db, tmp_path):
    seed_open_days(db, days(WEEKENDS_BEFORE[1:], [20, 22, 21]))

    with pytest.raises(
        ScrapeFailed, match=r"Top of Lenoir: 10 menu items, under half of the recent weekend normal \(21\)"
    ):
        scrape_lenoir(db, tmp_path, menu_page(10))

    # What was there is still saved.
    assert len(hall_menu(db, "top-of-lenoir")) == 10


def test_an_item_count_of_at_least_half_of_recent_normal_does_not_fail(db, clean_db, tmp_path):
    seed_open_days(db, days(WEEKENDS_BEFORE, [20, 22, 21, 22]))

    scrape_lenoir(db, tmp_path, menu_page(11))

    assert len(hall_menu(db, "top-of-lenoir")) == 11


def test_a_weekend_menu_is_compared_with_recent_weekends_not_weekdays(db, clean_db, tmp_path):
    # Weekend Continental/Brunch menus are much smaller than weekday Breakfast/Lunch/Dinner.
    seed_open_days(db, {**days(WEEKENDS_BEFORE, [14, 15, 16, 15]), **days(WEEKDAYS_BEFORE, [40, 42, 41, 40, 42])})

    scrape_lenoir(db, tmp_path, menu_page(12))

    assert len(hall_menu(db, "top-of-lenoir")) == 12


def test_a_weekday_menu_is_compared_with_recent_weekdays_not_weekends(db, clean_db, tmp_path):
    # Mixed with the four small weekend days, the median would be 15.5 and 14 items would pass.
    weekends = [TODAY - timedelta(days=7), TODAY - timedelta(days=6), TODAY, TODAY + timedelta(days=1)]
    seed_open_days(db, {**days(weekends, [14, 15, 16, 15]), **days(WEEKDAYS_BEFORE[3:], [40, 42])})

    with pytest.raises(
        ScrapeFailed, match=r"Top of Lenoir: 14 menu items, under half of the recent weekday normal \(41\)"
    ):
        scrape_lenoir(db, tmp_path, menu_page(14, day=NEXT_MONDAY))


def test_a_first_weekend_after_only_weekdays_is_not_compared(db, clean_db, tmp_path):
    # No weekend in the last two weeks to compare with, so only the "no items" check applies.
    seed_open_days(db, days(WEEKDAYS_BEFORE, [40, 42, 41, 40, 42]))

    scrape_lenoir(db, tmp_path, menu_page(12))

    assert len(hall_menu(db, "top-of-lenoir")) == 12


def test_a_closed_day_does_not_fail_the_run(db, clean_db):
    # The real Lenoir page with its meal tabs removed (fixtures/unc/README.md).
    scrape(db, FakeFetcher({LENOIR_URL: "closed-top-of-lenoir.html"}), [LENOIR], now=NOW)

    assert hall_day(db, "top-of-lenoir") == ("closed", [])


def test_a_closed_day_after_normal_days_does_not_fail_the_run(db, clean_db, tmp_path):
    seed_open_days(db, days(WEEKENDS_BEFORE[1:], [20, 22, 21]))

    scrape_lenoir(db, tmp_path, location_page())

    assert hall_day(db, "top-of-lenoir") == ("closed", [])


def test_a_page_that_is_not_a_location_page_fails_the_run(db, clean_db, tmp_path):
    # E.g. a maintenance or error page: no menu tabs, but not a closed hall's page either.
    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: unexpected page structure \(not a location page"):
        scrape_lenoir(db, tmp_path, "<html><body><h1>We'll be back soon</h1></body></html>")


def test_a_menu_in_an_unexpected_shape_fails_the_run(db, clean_db, tmp_path):
    # A meal period tab whose panel is missing.
    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: unexpected page structure \(no panel for meal period"):
        scrape_lenoir(db, tmp_path, menu_page(5, panel_id="renamed"))


def test_a_failing_hall_does_not_stop_a_healthy_one_being_saved_and_the_run_exits_non_zero(
    db, clean_db, migrated_database_url, tmp_path, capsys
):
    # Lenoir is fetched first, so Chase comes after the failure.
    fetcher = FakeFetcher(
        {
            LENOIR_URL: page_file(tmp_path, "maintenance.html", "<html><body>We'll be back soon</body></html>"),
            CHASE_URL: page_file(tmp_path, "chase.html", menu_page(6)),
        }
    )

    exit_code = main(
        ["--database-url", migrated_database_url, "--archive-dir", str(tmp_path / "archive")],
        fetcher=fetcher,
        now=NOW,
    )

    assert exit_code != 0
    assert len(hall_menu(db, "chase")) == 6
    err = capsys.readouterr().err
    assert "Top of Lenoir: unexpected page structure" in err
    assert "Chase" not in err


def test_a_page_with_no_readable_date_fails_the_run(db, clean_db, tmp_path):
    # Without the page's own date there is no telling which day this menu is for.
    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: unexpected page structure \(no date"):
        scrape_lenoir(db, tmp_path, menu_page(5, day=None))

    assert db.execute("select count(*) from menu_day").fetchone() == (0,)
