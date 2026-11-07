"""Run orchestration: one scrape of every configured location.

Per location: fetch the page -> parse -> save the menu. Later steps (nutrition,
health checks, raw archive) slot in here as further per-location steps.
"""

from collections.abc import Iterable
from datetime import date

import psycopg

from dinnr.fetcher import Fetcher
from dinnr.locations import Location
from dinnr.menu_parser import parse_menu
from dinnr.repository import save_menu


def scrape(conn: psycopg.Connection, fetcher: Fetcher, locations: Iterable[Location], *, today: date) -> None:
    for location in locations:
        html = fetcher.get(location.url)
        menu = parse_menu(html)
        save_menu(conn, location, today, menu)
