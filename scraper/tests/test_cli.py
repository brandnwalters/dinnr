import subprocess


def test_dinnr_scrape_runs_and_exits_cleanly():
    result = subprocess.run(["dinnr-scrape"], capture_output=True, text=True)

    assert result.returncode == 0, result.stderr
