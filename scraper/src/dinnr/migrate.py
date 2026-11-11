"""Plain-SQL migration runner (`dinnr-migrate`).

Migrations are `NNNN_description.sql` files in the repo's top-level
`migrations/` directory. They are applied in filename order, each in its own
transaction, and recorded in `schema_migrations` so each runs only once. The
schema they build is the contract between the scraper and the web app.
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg

DEFAULT_DATABASE_URL = "postgresql://dinnr:dinnr@localhost:5432/dinnr"

# scraper/src/dinnr/migrate.py -> repo root
REPO_MIGRATIONS_DIR = Path(__file__).resolve().parents[3] / "migrations"


def migrate(database_url: str, migrations_dir: Path | None = None) -> list[str]:
    """Apply pending migrations. Returns the names of the ones applied."""
    migrations_dir = Path(migrations_dir or os.environ.get("DINNR_MIGRATIONS_DIR") or REPO_MIGRATIONS_DIR)
    files = sorted(migrations_dir.glob("*.sql"))
    applied_now: list[str] = []

    with psycopg.connect(database_url, autocommit=True) as conn:
        conn.execute(
            """
            create table if not exists schema_migrations (
                name text primary key,
                applied_at timestamptz not null default now()
            )
            """
        )
        already = {row[0] for row in conn.execute("select name from schema_migrations")}

        for path in files:
            if path.name in already:
                continue
            with conn.transaction():
                conn.execute(path.read_text())
                conn.execute("insert into schema_migrations (name) values (%s)", (path.name,))
            applied_now.append(path.name)

    return applied_now


def add_database_url_argument(parser: argparse.ArgumentParser) -> None:
    """The `--database-url` option every dinnr command takes."""
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL),
        help="Postgres URL (default: $DATABASE_URL or the local Docker dev DB)",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dinnr-migrate", description=__doc__)
    add_database_url_argument(parser)
    args = parser.parse_args(argv)

    applied = migrate(args.database_url)
    for name in applied:
        print(f"applied {name}")
    print(f"{len(applied)} migration(s) applied")
    return 0


if __name__ == "__main__":
    sys.exit(main())
