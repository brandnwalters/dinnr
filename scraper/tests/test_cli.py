import subprocess
from datetime import UTC, date, datetime

from dinnr.cli import main
from dinnr.testing import FakeFetcher

LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"


def test_dinnr_scrape_is_installed_as_a_command():
    result = subprocess.run(["dinnr-scrape", "--help"], capture_output=True, text=True)

    assert result.returncode == 0, result.stderr
    assert "--database-url" in result.stdout


def test_dinnr_scrape_saves_todays_menu_under_the_new_york_date(clean_db, migrated_database_url):
    # 03:00 UTC on Nov 8 is still the evening of Nov 7 in Chapel Hill.
    now = datetime(2026, 11, 8, 3, 0, tzinfo=UTC)
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html"})

    exit_code = main(["--database-url", migrated_database_url], fetcher=fetcher, now=now)

    assert exit_code == 0
    assert clean_db.execute("select date from menu_day").fetchall() == [(date(2026, 11, 7),)]
    assert clean_db.execute("select count(*) from menu_item").fetchone() == (348,)
