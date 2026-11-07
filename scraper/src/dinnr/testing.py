"""Helpers for tests that need a real Postgres database."""

from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg import sql

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
