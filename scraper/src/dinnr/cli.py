"""Command-line entry point for the scraper (`dinnr-scrape`).

Scrapes every configured location's page for today (America/New_York) into
Postgres, through the polite fetcher. Every fetched page is also saved gzipped
under the archive folder (see `dinnr.archive`). Exits 1, naming each failing
hall and why, if any hall's page fails a health check (see `dinnr.health`).
"""

import argparse
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

import psycopg

from dinnr.archive import ArchivingFetcher
from dinnr.fetcher import Fetcher, PoliteFetcher
from dinnr.locations import LOCATIONS, dining_today
from dinnr.migrate import add_database_url_argument
from dinnr.run import ScrapeFailed, scrape


def main(argv: list[str] | None = None, *, fetcher: Fetcher | None = None, now: datetime | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dinnr-scrape", description=__doc__)
    add_database_url_argument(parser)
    parser.add_argument(
        "--archive-dir",
        type=Path,
        default=Path(os.environ.get("DINNR_ARCHIVE_DIR", "archive")),
        help="folder for gzipped copies of fetched pages (default: $DINNR_ARCHIVE_DIR or ./archive)",
    )
    args = parser.parse_args(argv)

    now = now or datetime.now(UTC)
    today = dining_today(now)
    archiving = ArchivingFetcher(fetcher or PoliteFetcher(), args.archive_dir, run_at=now, locations=LOCATIONS)
    with psycopg.connect(args.database_url) as conn:
        try:
            scrape(conn, archiving, LOCATIONS, today=today, now=now)
        except ScrapeFailed as e:
            print(f"dinnr-scrape: {e}", file=sys.stderr)
            return 1
    print(f"dinnr-scrape: saved {len(LOCATIONS)} location(s) for {today}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
