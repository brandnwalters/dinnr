"""Repository: all Postgres writes for the scraper.

Writes are upserts keyed on natural keys, so re-running a scrape on the same
day updates rows in place. Rows no longer on the page (e.g. a midday menu swap)
are removed from that day's menu.

Writes are batched (bulk `unnest` upserts, and psycopg's pipelined
`executemany`), so a menu or a batch of nutrition labels costs a fixed handful
of round trips whatever its size.
"""

from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

import psycopg
from psycopg.types.json import Jsonb

from dinnr.locations import Location
from dinnr.menu_parser import Menu
from dinnr.nutrition import Nutrition
from dinnr.stations import excluded_from_combos


def save_location(conn: psycopg.Connection, location: Location) -> int:
    return conn.execute(
        """
        insert into location (slug, name, url) values (%s, %s, %s)
        on conflict (slug) do update set name = excluded.name, url = excluded.url
        returning id
        """,
        (location.slug, location.name, location.url),
    ).fetchone()[0]


def save_stations(conn: psycopg.Connection, names: Iterable[str], cache: dict[str, int] | None = None) -> dict[str, int]:
    """Upsert stations by name (one round trip) and return name -> id, for `names` and anything cached.

    `cache` (name -> id, updated in place) lets one run skip stations it has
    already saved: a station's only other column is derived from its name.
    """
    cache = {} if cache is None else cache
    new = [name for name in dict.fromkeys(names) if name not in cache]
    if new:
        rows = conn.execute(
            """
            insert into station (name, excluded_from_combos)
            select name, excluded
            from unnest(%s::text[], %s::boolean[]) with ordinality as s (name, excluded, ord)
            order by ord
            on conflict (name) do update set excluded_from_combos = excluded.excluded_from_combos
            returning name, id
            """,
            (new, [excluded_from_combos(name) for name in new]),
        ).fetchall()
        cache.update(rows)
    return cache


def save_menu(
    conn: psycopg.Connection,
    location: Location,
    day: date,
    menu: Menu,
    *,
    station_ids: dict[str, int] | None = None,
) -> int:
    """Save one location's menu for `day` (in one transaction). Returns the menu_day id.

    `station_ids` is an optional per-run cache of station ids (see `save_stations`).
    """
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

        stations = save_stations(
            conn, (station.name for mp in menu.meal_periods for station in mp.stations), station_ids
        )

        # A tab name repeated on the page is one meal period (the later tab's position and hours win).
        periods = {mp.name: (position, mp) for position, mp in enumerate(menu.meal_periods)}
        meal_period_ids = dict(
            conn.execute(
                """
                insert into meal_period (menu_day_id, name, position, start_time, end_time)
                select %s, name, position, start_time, end_time
                from unnest(%s::text[], %s::int[], %s::time[], %s::time[]) as mp (name, position, start_time, end_time)
                order by position
                on conflict (menu_day_id, name) do update
                set position = excluded.position, start_time = excluded.start_time, end_time = excluded.end_time
                returning name, id
                """,
                (
                    menu_day_id,
                    list(periods),
                    [position for position, _ in periods.values()],
                    [mp.start for _, mp in periods.values()],
                    [mp.end for _, mp in periods.values()],
                ),
            ).fetchall()
        )

        items = []
        for meal_period in menu.meal_periods:
            meal_period_id = meal_period_ids[meal_period.name]
            position = 0
            for station in meal_period.stations:
                for item in station.items:
                    items.append(
                        (
                            meal_period_id,
                            stations[station.name],
                            item.recipe_id,
                            item.name,
                            position,
                            list(item.dietary_tags),
                            list(item.allergens),
                            item.normalized_name,
                        )
                    )
                    position += 1
        with conn.cursor() as cur:
            # Rows can repeat a key (same recipe twice at one station), which one bulk
            # `insert ... on conflict` can't take; executemany upserts them in order.
            cur.executemany(
                """
                insert into menu_item
                    (meal_period_id, station_id, recipe_id, name, position, dietary_tags, allergens, normalized_name)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (meal_period_id, station_id, recipe_id)
                do update set name = excluded.name, position = excluded.position,
                              dietary_tags = excluded.dietary_tags,
                              allergens = excluded.allergens,
                              normalized_name = excluded.normalized_name
                """,
                items,
            )

        # Prune what's no longer on the page (a removed meal period's items go with it).
        conn.execute(
            "delete from meal_period where menu_day_id = %s and not (id = any(%s))",
            (menu_day_id, list(meal_period_ids.values())),
        )
        conn.execute(
            """
            delete from menu_item mi
            using meal_period mp
            where mp.id = mi.meal_period_id and mp.menu_day_id = %s
              and (mi.meal_period_id, mi.station_id, mi.recipe_id) not in (
                  select * from unnest(%s::int[], %s::int[], %s::int[])
              )
            """,
            (menu_day_id, [i[0] for i in items], [i[1] for i in items], [i[2] for i in items]),
        )
    return menu_day_id


def menu_day_item_count(conn: psycopg.Connection, menu_day_id: int) -> int:
    return conn.execute(
        "select count(*) from menu_item mi join meal_period mp on mp.id = mi.meal_period_id where mp.menu_day_id = %s",
        (menu_day_id,),
    ).fetchone()[0]


def open_day_item_counts(conn: psycopg.Connection, location: Location, start: date, end: date) -> dict[date, int]:
    """Saved item counts of the location's open days with start <= date < end, by date."""
    rows = conn.execute(
        """
        select md.date, count(mi.id)
        from menu_day md
        join location l on l.id = md.location_id
        left join meal_period mp on mp.menu_day_id = md.id
        left join menu_item mi on mi.meal_period_id = mp.id
        where l.slug = %s and md.status = 'open' and md.date >= %s and md.date < %s
        group by md.id
        """,
        (location.slug, start, end),
    )
    return dict(rows.fetchall())


def slugs_with_menu_day(conn: psycopg.Connection, day: date) -> set[str]:
    """Slugs of the locations with a saved menu day (open or closed) for `day`."""
    rows = conn.execute(
        "select l.slug from menu_day md join location l on l.id = md.location_id where md.date = %s",
        (day,),
    )
    return {row[0] for row in rows}


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


def save_nutrition(conn: psycopg.Connection, nutrition_by_recipe: dict[int, Nutrition], fetched_at: datetime) -> None:
    """Insert or replace the nutrition of every recipe in `nutrition_by_recipe` (one pipelined batch)."""
    if not nutrition_by_recipe:
        return
    columns = ["recipe_id", *_NUTRITION_COLUMNS, "micronutrients", "fetched_at"]
    updates = ", ".join(f"{c} = excluded.{c}" for c in columns[1:])
    rows = [
        [
            recipe_id,
            *(getattr(nutrition, c) for c in _NUTRITION_COLUMNS),
            Jsonb([{"name": m.name, "amount": _json_number(m.amount), "unit": m.unit} for m in nutrition.micronutrients]),
            fetched_at,
        ]
        for recipe_id, nutrition in nutrition_by_recipe.items()
    ]
    with conn.cursor() as cur:
        cur.executemany(
            f"insert into recipe_nutrition ({', '.join(columns)}) values ({', '.join(['%s'] * len(columns))})"
            f" on conflict (recipe_id) do update set {updates}",
            rows,
        )
