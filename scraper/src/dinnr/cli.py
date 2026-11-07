"""Command-line entry point for the scraper (`dinnr-scrape`).

Scrapes every configured location's page for today (America/New_York) into
Postgres, through the polite fetcher. Every fetched page is also saved gzipped
under the archive folder (see `dinnr.archive`).
"""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import psycopg

from dinnr.archive import ArchivingFetcher
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
    parser.add_argument(
        "--archive-dir",
        type=Path,
        default=Path(os.environ.get("DINNR_ARCHIVE_DIR", "archive")),
        help="folder for gzipped copies of fetched pages (default: $DINNR_ARCHIVE_DIR or ./archive)",
    )
    args = parser.parse_args(argv)

    now = now or datetime.now(DINING_TZ)
    today = now.astimezone(DINING_TZ).date()
    archiving = ArchivingFetcher(fetcher or PoliteFetcher(), args.archive_dir, run_at=now, locations=LOCATIONS)
    with psycopg.connect(args.database_url) as conn:
        scrape(conn, archiving, LOCATIONS, today=today, now=now)
    print(f"dinnr-scrape: saved {len(LOCATIONS)} location(s) for {today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
