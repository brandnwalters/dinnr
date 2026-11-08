"""Seam 1: a run that hits fetch errors or crashes keeps every hall and recipe it could save.

Small hand-made pages (see test_scrape_health) keep these fast; each page's
recipes are served the default recipe fixture.
"""

import pytest

from dinnr.cli import main
from dinnr.fetcher import FetchError
from dinnr.nutrition import recipe_url
from dinnr.run import ScrapeFailed, scrape
from dinnr.testing import FakeFetcher
from test_scrape_health import LENOIR, NOW, menu_page, page_file
from test_scrape_nutrition import CHASE, nutrition
from test_scrape_run import CHASE_URL, LENOIR_URL, TODAY, hall_menu

# menu_page(n) lists recipes 900000 .. 900000 + n - 1.
FIRST_RECIPE = 900000


def two_halls(tmp_path, *, lenoir_items=3, chase_items=4, **kwargs) -> FakeFetcher:
    return FakeFetcher(
        {
            LENOIR_URL: page_file(tmp_path, "lenoir.html", menu_page(lenoir_items)),
            CHASE_URL: page_file(tmp_path, "chase.html", menu_page(chase_items)),
        },
        **kwargs,
    )


def run_cli(migrated_database_url, tmp_path, fetcher) -> int:
    return main(
        ["--database-url", migrated_database_url, "--archive-dir", str(tmp_path / "archive")],
        fetcher=fetcher,
        now=NOW,
    )


def saved_recipes(db) -> set[int]:
    return {r[0] for r in db.execute("select recipe_id from recipe_nutrition")}


def test_a_hall_page_that_cannot_be_fetched_is_reported_and_the_other_halls_are_still_saved(
    db, clean_db, migrated_database_url, tmp_path, capsys
):
    # Lenoir is fetched first, so Chase comes after the failure.
    fetcher = two_halls(tmp_path, failures={LENOIR_URL: FetchError(f"GET {LENOIR_URL} returned HTTP 503")})

    exit_code = run_cli(migrated_database_url, tmp_path, fetcher)

    assert exit_code == 1
    assert len(hall_menu(db, "chase")) == 4
    assert hall_menu(db, "top-of-lenoir") == []
    assert saved_recipes(db) == {FIRST_RECIPE + n for n in range(4)}
    err = capsys.readouterr().err
    assert "Top of Lenoir: could not fetch the page (GET" in err
    assert "HTTP 503" in err
    assert "Chase" not in err


def test_a_timeout_fetching_a_hall_page_is_reported_like_any_other_fetch_error(db, clean_db, tmp_path):
    fetcher = two_halls(tmp_path, failures={CHASE_URL: TimeoutError("timed out")})

    with pytest.raises(ScrapeFailed) as failed:
        scrape(db, fetcher, [LENOIR, CHASE], today=TODAY, now=NOW)

    assert failed.value.problems == ["Chase: could not fetch the page (timed out); nothing saved"]
    assert len(hall_menu(db, "top-of-lenoir")) == 3


def test_a_recipe_that_cannot_be_fetched_is_skipped_and_retried_next_run(db, clean_db, tmp_path):
    broken = recipe_url(FIRST_RECIPE + 1)
    first = two_halls(tmp_path, failures={broken: FetchError("HTTP 500")})

    scrape(db, first, [LENOIR, CHASE], today=TODAY, now=NOW)

    # The run carries on: the rest of Lenoir's recipes, and Chase, are saved.
    assert broken in first.requested
    assert saved_recipes(db) == {FIRST_RECIPE + n for n in range(4)} - {FIRST_RECIPE + 1}
    assert len(hall_menu(db, "chase")) == 4

    retry = two_halls(tmp_path)
    scrape(db, retry, [LENOIR, CHASE], today=TODAY, now=NOW)

    assert [url for url in retry.requested if "recipe.php" in url] == [broken]
    assert nutrition(db, FIRST_RECIPE + 1)["name"] == "Chicken Breast"


def test_halls_saved_before_a_crash_are_kept(db, clean_db, migrated_database_url, tmp_path):
    # Something unexpected (not a fetch error) stops the run at Chase's page.
    fetcher = two_halls(tmp_path, failures={CHASE_URL: RuntimeError("boom")})

    with pytest.raises(RuntimeError, match="boom"):
        run_cli(migrated_database_url, tmp_path, fetcher)

    # Read through another connection: Lenoir's menu and nutrition were committed.
    assert len(hall_menu(db, "top-of-lenoir")) == 3
    assert saved_recipes(db) == {FIRST_RECIPE + n for n in range(3)}


def test_nutrition_saved_before_a_crash_is_kept(db, clean_db, migrated_database_url, tmp_path):
    fetcher = two_halls(tmp_path, lenoir_items=5, failures={recipe_url(FIRST_RECIPE + 3): RuntimeError("boom")})

    with pytest.raises(RuntimeError, match="boom"):
        run_cli(migrated_database_url, tmp_path, fetcher)

    assert len(hall_menu(db, "top-of-lenoir")) == 5
    assert saved_recipes(db) == {FIRST_RECIPE + n for n in range(3)}


def test_a_hall_with_unfetchable_recipes_is_still_healthy(db, clean_db, tmp_path):
    # Nutrition is best effort: it never fails the run.
    failures = {recipe_url(FIRST_RECIPE + n): FetchError("HTTP 500") for n in range(3)}

    scrape(db, two_halls(tmp_path, failures=failures), [LENOIR], today=TODAY, now=NOW)

    assert len(hall_menu(db, "top-of-lenoir")) == 3
    assert saved_recipes(db) == set()
