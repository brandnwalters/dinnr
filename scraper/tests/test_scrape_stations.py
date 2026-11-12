"""Seam 1: stations that shouldn't be part of meal combos are flagged by the scraper."""

from dinnr.locations import LOCATIONS
from dinnr.run import scrape
from dinnr.testing import FakeFetcher
from test_scrape_run import BOTH_HALLS, NOW


def test_condiment_beverage_and_cereal_stations_are_flagged_as_excluded_from_combos(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS, now=NOW)

    stations = dict(db.execute("select name, excluded_from_combos from station").fetchall())
    flagged = {name for name, excluded in stations.items() if excluded}
    # Across every station on both fixture pages, only these three hold condiment-type items.
    assert flagged == {"Condiments and Spreads", "Beverages", "Cereal"}
    assert stations["The Grill"] is False
    assert stations["Salad Bar"] is False
    assert stations["Stress Less Cabinet"] is False
