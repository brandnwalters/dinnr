"""Run orchestration: one scrape of every configured location.

Per location: fetch the page -> parse -> save the menu under the date the page
shows -> fetch and save nutrition for recipes that are new or stale -> health
checks. A hall whose page can't be fetched or fails a check doesn't stop the
others: every hall is scraped, then the run raises `ScrapeFailed` listing each failing hall and why.

Work is committed as it's done (each hall's menu, then its nutrition), so a
run that dies part way keeps everything saved before that point. A recipe
whose nutrition can't be fetched or parsed is skipped; it has no row, so the
next run tries it again.
"""

import logging
from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta

import psycopg

from dinnr.fetcher import FETCH_ERRORS, Fetcher
from dinnr.health import RECENT_DAYS, menu_problems
from dinnr.locations import Location
from dinnr.menu_parser import Menu, MenuParseError, parse_menu
from dinnr.nutrition import Nutrition, NutritionParseError, needs_fetch, parse_nutrition, recipe_url
from dinnr.repository import (
    menu_day_item_count,
    nutrition_fetched_at,
    open_day_item_counts,
    save_menu,
    save_nutrition,
)

log = logging.getLogger(__name__)

# Nutrition labels saved per round trip; a crash loses at most the batch in flight.
NUTRITION_BATCH = 25


class ScrapeFailed(Exception):
    """One or more halls failed. `problems` holds one "<hall>: <reason>" line per failure."""

    def __init__(self, problems: list[str]):
        self.problems = problems
        super().__init__("scrape failed:\n" + "\n".join(f"  {p}" for p in problems))


def scrape(
    conn: psycopg.Connection,
    fetcher: Fetcher,
    locations: Iterable[Location],
    *,
    now: datetime | None = None,
) -> dict[str, date]:
    """Scrape every location; returns the date each hall's menu was saved under, by hall name."""
    now = now or datetime.now(UTC)
    problems = []
    saved: dict[str, date] = {}
    station_ids: dict[str, int] = {}  # the halls share most station names
    for location in locations:
        try:
            html = fetcher.get(location.url)
        except FETCH_ERRORS as e:
            problems.append(f"{location.name}: could not fetch the page ({e}); nothing saved")
            continue
        try:
            menu = parse_menu(html)
        except MenuParseError as e:
            problems.append(f"{location.name}: unexpected page structure ({e}); nothing saved")
            continue
        menu_day_id = save_menu(conn, location, menu.day, menu, station_ids=station_ids)
        conn.commit()
        saved[location.name] = menu.day
        update_nutrition(conn, fetcher, menu, now=now)
        recent = open_day_item_counts(conn, location, menu.day - timedelta(days=RECENT_DAYS), menu.day)
        item_count = menu_day_item_count(conn, menu_day_id)
        problems += [f"{location.name}: {p}" for p in menu_problems(menu, item_count, recent)]
    if problems:
        raise ScrapeFailed(problems)
    return saved


def update_nutrition(conn: psycopg.Connection, fetcher: Fetcher, menu: Menu, *, now: datetime) -> None:
    """Fetch and save nutrition for the menu's recipes that were never fetched or are stale.

    A recipe that can't be fetched, or whose response can't be parsed, is
    logged and skipped (no row is saved), so the next run tries it again.
    Labels are saved and committed in batches of NUTRITION_BATCH, and whatever
    is pending when the loop stops (even on an exception) is saved first.
    """
    recipe_ids = menu.recipe_ids()
    fetched_at = nutrition_fetched_at(conn, recipe_ids)
    pending: dict[int, Nutrition] = {}

    def flush() -> None:
        save_nutrition(conn, pending, now)
        conn.commit()
        pending.clear()

    try:
        for recipe_id in recipe_ids:
            if not needs_fetch(fetched_at.get(recipe_id), now):
                continue
            try:
                body = fetcher.get(recipe_url(recipe_id))
            except FETCH_ERRORS as e:
                log.warning("skipping nutrition for recipe %s: could not fetch it (%s)", recipe_id, e)
                continue
            try:
                pending[recipe_id] = parse_nutrition(body)
            except NutritionParseError as e:
                log.warning("skipping nutrition for recipe %s: %s", recipe_id, e)
                continue
            if len(pending) >= NUTRITION_BATCH:
                flush()
    finally:
        flush()
