import subprocess
from datetime import UTC, datetime

from dinnr import cli as scrape_cli
from dinnr.check_today import main
from dinnr.testing import FakeFetcher

LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"
CHASE_URL = "https://dining.unc.edu/locations/chase/"


def scrape_at(now: datetime, database_url: str, tmp_path) -> None:
    fetcher = FakeFetcher({LENOIR_URL: "top-of-lenoir.html", CHASE_URL: "chase.html"})
    exit_code = scrape_cli.main(["--database-url", database_url, "--archive-dir", str(tmp_path)], fetcher=fetcher, now=now)
    assert exit_code == 0


def test_passes_when_every_hall_has_todays_menu(clean_db, migrated_database_url, tmp_path):
    # 09:30 UTC scrape, 14:00 UTC check: both Nov 10 in Chapel Hill.
    scrape_at(datetime(2026, 11, 10, 9, 30, tzinfo=UTC), migrated_database_url, tmp_path)

    exit_code = main(["--database-url", migrated_database_url], now=datetime(2026, 11, 10, 14, 0, tzinfo=UTC))

    assert exit_code == 0


def test_fails_naming_each_hall_with_no_menu_for_today(clean_db, migrated_database_url, capsys):
    exit_code = main(["--database-url", migrated_database_url], now=datetime(2026, 11, 10, 14, 0, tzinfo=UTC))

    assert exit_code == 1
    err = capsys.readouterr().err
    assert "Top of Lenoir" in err
    assert "Chase" in err
    assert "2026-11-10" in err


def test_yesterdays_menu_does_not_count_for_today(clean_db, migrated_database_url, tmp_path):
    # 03:00 UTC on Nov 10 is still Nov 9 in Chapel Hill: the last scrape saved Nov 9.
    scrape_at(datetime(2026, 11, 10, 3, 0, tzinfo=UTC), migrated_database_url, tmp_path)

    exit_code = main(["--database-url", migrated_database_url], now=datetime(2026, 11, 10, 14, 0, tzinfo=UTC))

    assert exit_code == 1


def test_dinnr_check_today_is_installed_as_a_command():
    result = subprocess.run(["dinnr-check-today", "--help"], capture_output=True, text=True)

    assert result.returncode == 0, result.stderr
    assert "--database-url" in result.stdout
