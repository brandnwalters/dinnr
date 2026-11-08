"""Run orchestration: one scrape of every configured location.

Per location: fetch the page -> parse -> save the menu -> fetch and save
nutrition for recipes that are new or stale -> health checks. A hall that
fails a check doesn't stop the others: every hall is scraped, then the run
raises `ScrapeFailed` listing each failing hall and why.
"""

import logging
from collections.abc import Iterable
from datetime import UTC, date, datetime, timedelta

import psycopg

from dinnr.fetcher import Fetcher
from dinnr.health import RECENT_DAYS, menu_problems
from dinnr.locations import Location
from dinnr.menu_parser import Menu, MenuParseError, parse_menu
from dinnr.nutrition import NutritionParseError, needs_fetch, parse_nutrition, recipe_url
from dinnr.repository import (
    menu_day_item_count,
    nutrition_fetched_at,
    open_day_item_counts,
    save_menu,
    save_nutrition,
)

log = logging.getLogger(__name__)


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
    today: date,
    now: datetime | None = None,
) -> None:
    now = now or datetime.now(UTC)
    problems = []
    for location in locations:
        html = fetcher.get(location.url)
        try:
            menu = parse_menu(html)
        except MenuParseError as e:
            problems.append(f"{location.name}: unexpected page structure ({e}); nothing saved")
            continue
        menu_day_id = save_menu(conn, location, today, menu)
        update_nutrition(conn, fetcher, menu, now=now)
        recent = open_day_item_counts(conn, location, today - timedelta(days=RECENT_DAYS), today)
        item_count = menu_day_item_count(conn, menu_day_id)
        problems += [f"{location.name}: {p}" for p in menu_problems(menu, item_count, recent)]
    if problems:
        raise ScrapeFailed(problems)


def update_nutrition(conn: psycopg.Connection, fetcher: Fetcher, menu: Menu, *, now: datetime) -> None:
    """Fetch and save nutrition for the menu's recipes that were never fetched or are stale.

    A recipe whose response can't be parsed is logged and skipped (no row is
    saved), so the next run tries it again.
    """
    recipe_ids = list(
        dict.fromkeys(
            item.recipe_id for mp in menu.meal_periods for station in mp.stations for item in station.items
        )
    )
    fetched_at = nutrition_fetched_at(conn, recipe_ids)
    for recipe_id in recipe_ids:
        if not needs_fetch(fetched_at.get(recipe_id), now):
            continue
        body = fetcher.get(recipe_url(recipe_id))
        try:
            nutrition = parse_nutrition(body)
        except NutritionParseError as e:
            log.warning("skipping nutrition for recipe %s: %s", recipe_id, e)
            continue
        save_nutrition(conn, recipe_id, nutrition, now)
