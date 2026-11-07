"""Repository: all Postgres writes for the scraper.

Writes are upserts keyed on natural keys, so re-running a scrape on the same
day updates rows in place. Rows no longer on the page (e.g. a midday menu swap)
are removed from that day's menu.
"""

from datetime import date

import psycopg

from dinnr.locations import Location
from dinnr.menu_parser import Menu


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
            insert into menu_day (location_id, date) values (%s, %s)
            on conflict (location_id, date) do update set scraped_at = now()
            returning id
            """,
            (location_id, day),
        ).fetchone()[0]

        meal_period_ids = []
        for mp_position, meal_period in enumerate(menu.meal_periods):
            meal_period_id = conn.execute(
                """
                insert into meal_period (menu_day_id, name, position) values (%s, %s, %s)
                on conflict (menu_day_id, name) do update set position = excluded.position
                returning id
                """,
                (menu_day_id, meal_period.name, mp_position),
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
