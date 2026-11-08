"""Raw archive: every page a scrape run fetched is saved gzipped, named by location and run time."""

import gzip
from datetime import UTC, datetime

from dinnr.cli import main
from dinnr.testing import FIXTURES_DIR, FakeFetcher

LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"
CHASE_URL = "https://dining.unc.edu/locations/chase/"
BOTH_HALLS = {LENOIR_URL: "top-of-lenoir.html", CHASE_URL: "chase.html"}
NOW = datetime(2026, 11, 7, 14, 30, 5, tzinfo=UTC)
RUN = "20261107T143005Z"


def archived(archive_dir):
    return sorted(p.relative_to(archive_dir).as_posix() for p in archive_dir.rglob("*") if p.is_file())


def run(database_url, archive_dir, fetcher):
    return main(["--database-url", database_url, "--archive-dir", str(archive_dir)], fetcher=fetcher, now=NOW)


def test_a_run_saves_each_hall_page_gzipped_under_the_run_timestamp(clean_db, migrated_database_url, tmp_path):
    archive_dir = tmp_path / "archive"

    assert run(migrated_database_url, archive_dir, FakeFetcher(BOTH_HALLS)) == 0

    files = archived(archive_dir)
    assert [f for f in files if f.endswith(".html.gz")] == [f"{RUN}/chase.html.gz", f"{RUN}/top-of-lenoir.html.gz"]
    # Nutrition responses fetched during the run are archived alongside the hall pages.
    recipes = [f for f in files if not f.endswith(".html.gz")]
    assert recipes and all(f.startswith(f"{RUN}/recipe-") and f.endswith(".json.gz") for f in recipes)
    lenoir = gzip.decompress((archive_dir / RUN / "top-of-lenoir.html.gz").read_bytes()).decode()
    assert lenoir == (FIXTURES_DIR / "top-of-lenoir.html").read_text()


def test_a_page_the_parser_rejects_is_still_archived(clean_db, migrated_database_url, tmp_path):
    broken = '<div id="menu-tabs"><button role="tab" aria-controls="missing">Lunch (11am-2pm)</button></div>'
    broken_page = tmp_path / "broken.html"
    broken_page.write_text(broken)
    archive_dir = tmp_path / "archive"
    fetcher = FakeFetcher({LENOIR_URL: str(broken_page), CHASE_URL: "chase.html"})

    assert run(migrated_database_url, archive_dir, fetcher) == 1

    assert gzip.decompress((archive_dir / RUN / "top-of-lenoir.html.gz").read_bytes()).decode() == broken
