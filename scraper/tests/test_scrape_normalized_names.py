"""Seam 1: normalized item names (how favorites match a dish across stations and halls)."""

from datetime import date

from dinnr.locations import LOCATIONS
from dinnr.run import scrape
from dinnr.testing import FIXTURES_DIR, FakeFetcher

TODAY = date(2026, 11, 7)
LENOIR_URL = "https://dining.unc.edu/locations/top-of-lenoir/"
CHASE_URL = "https://dining.unc.edu/locations/chase/"
BOTH_HALLS = {LENOIR_URL: "top-of-lenoir.html", CHASE_URL: "chase.html"}


def normalized_names(db, slug):
    """{display name: normalized name} for one hall on TODAY."""
    rows = db.execute(
        """
        select mi.name, mi.normalized_name
        from menu_item mi
        join meal_period mp on mp.id = mi.meal_period_id
        join menu_day md on md.id = mp.menu_day_id
        join location l on l.id = md.location_id
        where l.slug = %s and md.date = %s
        """,
        (slug, TODAY),
    ).fetchall()
    return dict(rows)


def test_a_run_saves_each_items_normalized_name(db, clean_db):
    scrape(db, FakeFetcher(BOTH_HALLS), LOCATIONS)

    lenoir = normalized_names(db, "top-of-lenoir")
    assert lenoir["Waffle"] == "waffle"
    assert lenoir["Nashville Hot Chicken Biscuit"] == "nashville hot chicken biscuit"
    assert lenoir["Larry's® Decaf Coffee"] == "larry's® decaf coffee"
    assert normalized_names(db, "chase")["Waffle"] == "waffle"
    assert db.execute("select count(*) from menu_item where normalized_name is null").fetchone() == (0,)


def test_the_same_dish_with_different_casing_or_spacing_normalizes_the_same(db, clean_db, tmp_path):
    # Chase's page spells Lenoir's "Nashville Hot Chicken Biscuit" with odd casing and spacing.
    page = (FIXTURES_DIR / "chase.html").read_text()
    waffle = ">Waffle</a>"
    assert waffle in page
    variant = tmp_path / "chase.html"
    variant.write_text(page.replace(waffle, ">\n   NASHVILLE  hot\tChicken   biscuit  </a>", 1))

    scrape(db, FakeFetcher({**BOTH_HALLS, CHASE_URL: str(variant)}), LOCATIONS)

    lenoir = normalized_names(db, "top-of-lenoir")
    chase = normalized_names(db, "chase")
    assert lenoir["Nashville Hot Chicken Biscuit"] == "nashville hot chicken biscuit"
    assert chase["NASHVILLE hot Chicken biscuit"] == "nashville hot chicken biscuit"
