import subprocess
from datetime import UTC, date, datetime

from dinnr.cli import main
from dinnr.testing import FakeFetcher, dated_page

LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"
CHASE_URL = "https://dining.unc.edu/locations/chase/"


def test_dinnr_scrape_is_installed_as_a_command():
    result = subprocess.run(["dinnr-scrape", "--help"], capture_output=True, text=True)

    assert result.returncode == 0, result.stderr
    assert "--database-url" in result.stdout


def test_dinnr_scrape_saves_every_halls_menu_under_the_date_its_page_shows(clean_db, migrated_database_url, tmp_path):
    # 03:00 UTC on Nov 8: the fixtures' date pickers show Nov 7.
    now = datetime(2026, 11, 8, 3, 0, tzinfo=UTC)
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html", CHASE_URL: "chase.html"})

    exit_code = main(["--database-url", migrated_database_url, "--archive-dir", str(tmp_path)], fetcher=fetcher, now=now)

    assert exit_code == 0
    assert clean_db.execute("select distinct date from menu_day").fetchall() == [(date(2026, 11, 7),)]
    # Fixture README: Lenoir 348 + Chase 888 items.
    assert clean_db.execute("select count(*) from menu_item").fetchone() == (348 + 888,)


def items_on(db, day):
    return db.execute(
        "select mi.* from menu_item mi join meal_period mp on mp.id = mi.meal_period_id"
        " join menu_day md on md.id = mp.menu_day_id where md.date = %s order by mi.id",
        (day,),
    ).fetchall()


def test_an_evening_run_after_uncs_rollover_saves_tomorrows_menu_and_leaves_todays_alone(
    clean_db, migrated_database_url, tmp_path
):
    sunday, monday = date(2026, 11, 8), date(2026, 11, 9)
    args = ["--database-url", migrated_database_url, "--archive-dir", str(tmp_path / "archive")]
    # The 09:30 UTC morning scrape on Sunday Nov 8: both pages show Sunday.
    sunday_pages = {
        LENOIR_URL: dated_page("top-of-lenoir.html", sunday, tmp_path),
        CHASE_URL: dated_page("chase.html", sunday, tmp_path),
    }
    main(args, fetcher=FakeFetcher(sunday_pages), now=datetime(2026, 11, 8, 9, 30, tzinfo=UTC))
    sundays_items = items_on(clean_db, sunday)

    # 00:30 UTC on Nov 9 is 7:30pm on Sunday Nov 8 in Chapel Hill, but UNC's Lenoir page has
    # already rolled over to Monday Nov 9 (real capture, fixtures/unc/README.md).
    rollover_pages = {**sunday_pages, LENOIR_URL: "rollover-top-of-lenoir.html"}
    exit_code = main(args, fetcher=FakeFetcher(rollover_pages), now=datetime(2026, 11, 9, 0, 30, tzinfo=UTC))

    assert exit_code == 0
    assert clean_db.execute(
        "select l.slug, md.date from menu_day md join location l on l.id = md.location_id order by md.date, l.slug"
    ).fetchall() == [("chase", sunday), ("top-of-lenoir", sunday), ("top-of-lenoir", monday)]
    assert clean_db.execute(
        "select mp.name from meal_period mp join menu_day md on md.id = mp.menu_day_id"
        " where md.date = %s order by mp.position",
        (monday,),
    ).fetchall() == [("Breakfast",), ("Lunch",), ("Late Lunch",), ("Dinner",)]
    assert items_on(clean_db, sunday) == sundays_items
