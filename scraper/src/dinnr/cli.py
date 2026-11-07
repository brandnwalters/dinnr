"""Command-line entry point for the scraper (`dinnr-scrape`).

Scrapes every configured location's page for today (America/New_York) into
Postgres, through the polite fetcher.
"""

import argparse
import os
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

import psycopg

from dinnr.fetcher import Fetcher, PoliteFetcher
from dinnr.locations import LOCATIONS
from dinnr.migrate import DEFAULT_DATABASE_URL
from dinnr.run import scrape

DINING_TZ = ZoneInfo("America/New_York")


def main(argv: list[str] | None = None, *, fetcher: Fetcher | None = None, now: datetime | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dinnr-scrape", description=__doc__)
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL),
        help="Postgres URL (default: $DATABASE_URL or the local Docker dev DB)",
    )
    args = parser.parse_args(argv)

    today = (now or datetime.now(DINING_TZ)).astimezone(DINING_TZ).date()
    with psycopg.connect(args.database_url) as conn:
        scrape(conn, fetcher or PoliteFetcher(), LOCATIONS, today=today)
    print(f"dinnr-scrape: saved {len(LOCATIONS)} location(s) for {today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
