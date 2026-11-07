"""Helpers for tests: a fake fetcher serving saved fixtures, and test databases."""

from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg import sql

from dinnr.nutrition import RECIPE_URL

DEFAULT_TEST_DATABASE_URL = "postgresql://dinnr:dinnr@localhost:5432/dinnr_test"


def database_name(url: str) -> str:
    return urlsplit(url).path.lstrip("/")


def with_database_name(url: str, name: str | None = None, suffix: str = "") -> str:
    parts = urlsplit(url)
    new_name = (name or database_name(url)) + suffix
    return urlunsplit(parts._replace(path="/" + new_name))


def recreate_database(url: str) -> None:
    """Drop (if present) and create the database named in `url`, on the same server."""
    name = database_name(url)
    if not name:
        raise ValueError(f"no database name in {url!r}")
    admin_url = with_database_name(url, "postgres")
    with psycopg.connect(admin_url, autocommit=True) as conn:
        conn.execute(sql.SQL("drop database if exists {} with (force)").format(sql.Identifier(name)))
        conn.execute(sql.SQL("create database {}").format(sql.Identifier(name)))


# scraper/src/dinnr/testing.py -> repo root
FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "unc"

DEFAULT_RECIPE_FIXTURE = "recipes/recipe-13708.json"
RECIPE_URL_PREFIX = RECIPE_URL.split("{")[0]


class FakeFetcher:
    """A `Fetcher` that serves saved fixture files and records every URL asked for.

    `pages` maps a URL to a path relative to `fixtures/unc/`. A real page lists
    hundreds of recipes but only a few `recipe.php` responses are saved, so any
    recipe URL not in `pages` is served `recipe_fallback` (pass None to make
    those raise too). Asking for any other URL raises, so a test can never fall
    through to the live site.
    """

    def __init__(self, pages: dict[str, str], *, recipe_fallback: str | None = DEFAULT_RECIPE_FIXTURE):
        self.pages = dict(pages)
        self.recipe_fallback = recipe_fallback
        self.requested: list[str] = []

    def get(self, url: str) -> str:
        self.requested.append(url)
        path = self.pages.get(url)
        if path is None and self.recipe_fallback and url.startswith(RECIPE_URL_PREFIX):
            path = self.recipe_fallback
        if path is None:
            raise LookupError(f"FakeFetcher has no fixture for {url}")
        return (FIXTURES_DIR / path).read_text()
