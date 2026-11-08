"""Health checks: does a hall's saved menu look like a real menu?

A hall that isn't closed must have items, and not fewer than half its recent
normal (the median item count of its open days in the last RECENT_DAYS days,
today excluded). With no recent history there's nothing to compare against,
so that check is skipped. A run that finds a problem still saves what it
could, then fails (see `dinnr.run.ScrapeFailed`), so the scheduled GitHub
Actions run fails and the owner gets an email.
"""

from statistics import median

from dinnr.menu_parser import Menu

RECENT_DAYS = 14
MIN_SHARE_OF_NORMAL = 0.5


def menu_problems(menu: Menu, item_count: int, recent_counts: list[int]) -> list[str]:
    """Why this menu looks wrong (empty list if it looks healthy).

    `item_count` is the hall's saved item count today; `recent_counts` the
    saved item counts of its recent open days.
    """
    if menu.closed:
        return []
    if item_count == 0:
        return [f"page has {len(menu.meal_periods)} meal period(s) but no menu items, and the hall isn't closed"]
    if recent_counts:
        normal = median(recent_counts)
        if item_count < MIN_SHARE_OF_NORMAL * normal:
            return [f"{item_count} menu items, under half of the recent normal ({normal:g})"]
    return []
