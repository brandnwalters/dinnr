"""Missed-scrape check (`dinnr-check-today`).

Exits 1, naming each hall, if any configured location has no saved menu day
for today (America/New_York). A closed day still counts: the scrape saved it.
Run on its own schedule a few hours after the morning scrape (see
.github/workflows/scrape-check.yml), so a scheduled scrape that never ran fails
a workflow run, and GitHub emails the owner, instead of leaving the app stale.
"""

import argparse
import os
import sys
from datetime import datetime

import psycopg

from dinnr.cli import DINING_TZ
from dinnr.locations import LOCATIONS
from dinnr.migrate import DEFAULT_DATABASE_URL
from dinnr.repository import slugs_with_menu_day


def main(argv: list[str] | None = None, *, now: datetime | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dinnr-check-today", description=__doc__)
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL),
        help="Postgres URL (default: $DATABASE_URL or the local Docker dev DB)",
    )
    args = parser.parse_args(argv)

    today = (now or datetime.now(DINING_TZ)).astimezone(DINING_TZ).date()
    with psycopg.connect(args.database_url) as conn:
        saved = slugs_with_menu_day(conn, today)
    missing = [location.name for location in LOCATIONS if location.slug not in saved]
    if missing:
        print(f"dinnr-check-today: no menu saved for {today}: {', '.join(missing)}", file=sys.stderr)
        return 1
    print(f"dinnr-check-today: all {len(LOCATIONS)} location(s) have a menu for {today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
