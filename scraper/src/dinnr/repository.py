"""Repository: all Postgres writes for the scraper.

Writes are upserts keyed on natural keys, so re-running a scrape on the same
day updates rows in place. Rows no longer on the page (e.g. a midday menu swap)
are removed from that day's menu.
"""

from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

import psycopg
from psycopg.types.json import Jsonb

from dinnr.locations import Location
from dinnr.menu_parser import Menu
from dinnr.nutrition import Nutrition


def save_location(conn: psycopg.Connection, location: Location) -> int:
    return conn.execute(
        """
        insert into location (slug, name, url) values (%s, %s, %s)
        on conflict (slug) do update set name = excluded.name, url = excluded.url
        returning id
        """,
        (location.slug, location.name, location.url),
    ).fetchone()[0]


def save_station(conn: psycopg.Connection, name: str) -> int:
    return conn.execute(
        """
        insert into station (name) values (%s)
        on conflict (name) do update set name = excluded.name
        returning id
        """,
        (name,),
    ).fetchone()[0]


def save_menu(conn: psycopg.Connection, location: Location, day: date, menu: Menu) -> int:
    """Save one location's menu for `day` (in one transaction). Returns the menu_day id."""
    with conn.transaction():
        location_id = save_location(conn, location)
        menu_day_id = conn.execute(
            """
            insert into menu_day (location_id, date, status) values (%s, %s, %s)
            on conflict (location_id, date) do update set scraped_at = now(), status = excluded.status
            returning id
            """,
            (location_id, day, "closed" if menu.closed else "open"),
        ).fetchone()[0]

        meal_period_ids = []
        for mp_position, meal_period in enumerate(menu.meal_periods):
            meal_period_id = conn.execute(
                """
                insert into meal_period (menu_day_id, name, position, start_time, end_time)
                values (%s, %s, %s, %s, %s)
                on conflict (menu_day_id, name) do update
                set position = excluded.position, start_time = excluded.start_time, end_time = excluded.end_time
                returning id
                """,
                (menu_day_id, meal_period.name, mp_position, meal_period.start, meal_period.end),
            ).fetchone()[0]
            meal_period_ids.append(meal_period_id)

            item_ids = []
            position = 0
            for station in meal_period.stations:
                station_id = save_station(conn, station.name)
                for item in station.items:
                    item_ids.append(
                        conn.execute(
                            """
                            insert into menu_item
                                (meal_period_id, station_id, recipe_id, name, position, dietary_tags)
                            values (%s, %s, %s, %s, %s, %s)
                            on conflict (meal_period_id, station_id, recipe_id)
                            do update set name = excluded.name, position = excluded.position,
                                          dietary_tags = excluded.dietary_tags
                            returning id
                            """,
                            (
                                meal_period_id,
                                station_id,
                                item.recipe_id,
                                item.name,
                                position,
                                list(item.dietary_tags),
                            ),
                        ).fetchone()[0]
                    )
                    position += 1
            conn.execute(
                "delete from menu_item where meal_period_id = %s and not (id = any(%s))",
                (meal_period_id, item_ids),
            )

        conn.execute(
            "delete from meal_period where menu_day_id = %s and not (id = any(%s))",
            (menu_day_id, meal_period_ids),
        )
    return menu_day_id


def menu_day_item_count(conn: psycopg.Connection, menu_day_id: int) -> int:
    return conn.execute(
        "select count(*) from menu_item mi join meal_period mp on mp.id = mi.meal_period_id where mp.menu_day_id = %s",
        (menu_day_id,),
    ).fetchone()[0]


def open_day_item_counts(conn: psycopg.Connection, location: Location, start: date, end: date) -> list[int]:
    """Saved item counts of the location's open days with start <= date < end."""
    rows = conn.execute(
        """
        select count(mi.id)
        from menu_day md
        join location l on l.id = md.location_id
        left join meal_period mp on mp.menu_day_id = md.id
        left join menu_item mi on mi.meal_period_id = mp.id
        where l.slug = %s and md.status = 'open' and md.date >= %s and md.date < %s
        group by md.id
        """,
        (location.slug, start, end),
    )
    return [row[0] for row in rows.fetchall()]


def nutrition_fetched_at(conn: psycopg.Connection, recipe_ids: Iterable[int]) -> dict[int, datetime]:
    """When each of `recipe_ids` last had its nutrition saved (ids never saved are absent)."""
    rows = conn.execute(
        "select recipe_id, fetched_at from recipe_nutrition where recipe_id = any(%s)",
        (list(recipe_ids),),
    )
    return dict(rows.fetchall())


def _json_number(amount: Decimal | None) -> int | float | None:
    if amount is None:
        return None
    return int(amount) if amount == amount.to_integral_value() else float(amount)


_NUTRITION_COLUMNS = [
    "name",
    "serving_size",
    "calories",
    "total_fat_g",
    "saturated_fat_g",
    "trans_fat_g",
    "cholesterol_mg",
    "sodium_mg",
    "total_carbohydrate_g",
    "dietary_fiber_g",
    "sugars_g",
    "added_sugar_g",
    "protein_g",
    "ingredients",
]


def save_nutrition(conn: psycopg.Connection, recipe_id: int, nutrition: Nutrition, fetched_at: datetime) -> None:
    """Insert or replace one recipe's nutrition."""
    columns = ["recipe_id", *_NUTRITION_COLUMNS, "micronutrients", "fetched_at"]
    micronutrients = [
        {"name": m.name, "amount": _json_number(m.amount), "unit": m.unit} for m in nutrition.micronutrients
    ]
    values = [recipe_id, *(getattr(nutrition, c) for c in _NUTRITION_COLUMNS), Jsonb(micronutrients), fetched_at]
    updates = ", ".join(f"{c} = excluded.{c}" for c in columns[1:])
    with conn.transaction():
        conn.execute(
            f"insert into recipe_nutrition ({', '.join(columns)}) values ({', '.join(['%s'] * len(columns))})"
            f" on conflict (recipe_id) do update set {updates}",
            values,
        )
