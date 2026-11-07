"""Run orchestration: one scrape of every configured location.

Per location: fetch the page -> parse -> save the menu -> fetch and save
nutrition for recipes that are new or stale. Later steps (health checks, raw
archive) slot in here as further per-location steps.
"""

import logging
from collections.abc import Iterable
from datetime import UTC, date, datetime

import psycopg

from dinnr.fetcher import Fetcher
from dinnr.locations import Location
from dinnr.menu_parser import Menu, parse_menu
from dinnr.nutrition import NutritionParseError, needs_fetch, parse_nutrition, recipe_url
from dinnr.repository import nutrition_fetched_at, save_menu, save_nutrition

log = logging.getLogger(__name__)


def scrape(
    conn: psycopg.Connection,
    fetcher: Fetcher,
    locations: Iterable[Location],
    *,
    today: date,
    now: datetime | None = None,
) -> None:
    now = now or datetime.now(UTC)
    for location in locations:
        html = fetcher.get(location.url)
        menu = parse_menu(html)
        save_menu(conn, location, today, menu)
        update_nutrition(conn, fetcher, menu, now=now)


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
