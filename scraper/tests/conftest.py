"""Shared pytest fixtures.

The test database URL comes from `DINNR_TEST_DATABASE_URL` (see CONTRIBUTING.md),
so concurrent checkouts can each point at their own database on one Postgres
server. Tests drop and recreate the databases they use; never point this at a
database you care about.
"""

import os
from collections.abc import Iterator

import psycopg
import pytest

from dinnr.migrate import migrate
from dinnr.testing import DEFAULT_TEST_DATABASE_URL, recreate_database, with_database_name


@pytest.fixture(scope="session")
def test_database_url() -> str:
    return os.environ.get("DINNR_TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)


@pytest.fixture(scope="session")
def migrated_database_url(test_database_url: str) -> str:
    """A freshly created test database with all repo migrations applied, once per session."""
    recreate_database(test_database_url)
    migrate(test_database_url)
    return test_database_url


@pytest.fixture
def db(migrated_database_url: str) -> Iterator[psycopg.Connection]:
    """A connection to the migrated test database."""
    with psycopg.connect(migrated_database_url) as conn:
        yield conn


@pytest.fixture
def clean_db(db: psycopg.Connection) -> psycopg.Connection:
    """The migrated test DB with every app table (all but `schema_migrations`) emptied."""
    tables = [
        row[0]
        for row in db.execute(
            "select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'"
        )
    ]
    if tables:
        db.execute("truncate " + ", ".join(f'"{t}"' for t in tables) + " restart identity cascade")
    db.commit()
    return db


@pytest.fixture
def fresh_database_url(test_database_url: str) -> str:
    """An empty, unmigrated scratch database (named after the test database)."""
    url = with_database_name(test_database_url, suffix="_scratch")
    recreate_database(url)
    return url
