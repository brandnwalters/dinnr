"""Seam 1: health checks. A run whose pages look wrong fails, saying which hall and why."""

import re
from datetime import UTC, datetime, timedelta

import pytest

from dinnr.cli import main
from dinnr.locations import LOCATIONS
from dinnr.run import ScrapeFailed, scrape
from dinnr.testing import FIXTURES_DIR, FakeFetcher
from test_scrape_run import BOTH_HALLS, LENOIR_URL, TODAY, hall_day, hall_menu, with_lenoir

NOW = datetime(2026, 11, 7, 19, 0, tzinfo=UTC)  # 2pm in Chapel Hill on TODAY
ITEM_LI =re.compile(r'<li class="menu-item-li".*?</li>', re.DOTALL)


def lenoir_variant(tmp_path, name, transform):
    """A copy of the real Lenoir page, changed by `transform(html) -> html`, saved under tmp_path."""
    page = tmp_path / name
    page.write_text(transform((FIXTURES_DIR / "top-of-lenoir.html").read_text()))
    return str(page)


def test_an_open_day_with_no_items_fails_the_run(db, clean_db, tmp_path):
    # Meal period tabs and stations are there, but every item is gone.
    empty = lenoir_variant(tmp_path, "empty.html", lambda html: ITEM_LI.sub("", html))

    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: .*no menu items"):
        scrape(db, with_lenoir(empty), LOCATIONS, today=TODAY)


def keep_first_items(n):
    def transform(html):
        seen = 0

        def keep(m):
            nonlocal seen
            seen += 1
            return m.group(0) if seen <= n else ""

        return ITEM_LI.sub(keep, html)

    return transform


def scrape_days_before(db, days, pages=BOTH_HALLS):
    for n in range(days, 0, -1):
        scrape(db, FakeFetcher(pages), LOCATIONS, today=TODAY - timedelta(days=n))


def test_an_item_count_under_half_of_recent_normal_fails_the_run(db, clean_db, tmp_path):
    scrape_days_before(db, 3)  # Lenoir's normal: 348 items
    collapsed = lenoir_variant(tmp_path, "collapsed.html", keep_first_items(150))

    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: 150 menu items, under half of the recent normal \(348\)"):
        scrape(db, with_lenoir(collapsed), LOCATIONS, today=TODAY)

    # What was there is still saved.
    assert len(hall_menu(db, "top-of-lenoir")) == 150


def test_an_item_count_over_half_of_recent_normal_does_not_fail(db, clean_db):
    # Weekday Lenoir (613 items) all week, then the weekend page (348): fewer, but not a collapse.
    scrape_days_before(db, 5, {**BOTH_HALLS, LENOIR_URL: "weekday-top-of-lenoir.html"})

    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, today=TODAY)

    assert len(hall_menu(db, "top-of-lenoir")) == 348


def test_a_closed_day_does_not_fail_the_run(db, clean_db):
    scrape(db, with_lenoir("closed-top-of-lenoir.html"), LOCATIONS, today=TODAY)

    assert hall_day(db, "top-of-lenoir") == ("closed", [])


def test_a_page_that_is_not_a_location_page_fails_the_run(db, clean_db, tmp_path):
    # E.g. a maintenance or error page: no menu tabs, but not a closed hall's page either.
    page = tmp_path / "maintenance.html"
    page.write_text("<html><body><h1>We'll be back soon</h1></body></html>")

    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: .*unexpected page structure"):
        scrape(db, with_lenoir(str(page)), LOCATIONS, today=TODAY)


def test_a_menu_in_an_unexpected_shape_fails_the_run(db, clean_db, tmp_path):
    # A meal period tab whose panel is missing.
    broken = lenoir_variant(tmp_path, "broken.html", lambda html: html.replace('id="tabinfo-2"', 'id="renamed"'))

    with pytest.raises(ScrapeFailed, match=r"Top of Lenoir: unexpected page structure \(no panel for meal period"):
        scrape(db, with_lenoir(broken), LOCATIONS, today=TODAY)


def test_a_failing_hall_does_not_stop_a_healthy_one_being_saved_and_the_run_exits_non_zero(
    db, clean_db, migrated_database_url, tmp_path, capsys
):
    page = tmp_path / "maintenance.html"
    page.write_text("<html><body><h1>We'll be back soon</h1></body></html>")
    # Lenoir is fetched first, so Chase comes after the failure.
    fetcher = with_lenoir(str(page))

    exit_code = main(
        ["--database-url", migrated_database_url, "--archive-dir", str(tmp_path / "archive")],
        fetcher=fetcher,
        now=NOW,
    )

    assert exit_code != 0
    # Fixture README: Chase has 888 items.
    assert len(hall_menu(db, "chase")) == 888
    err = capsys.readouterr().err
    assert "Top of Lenoir: unexpected page structure" in err
    assert "Chase" not in err
