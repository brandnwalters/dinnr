"""Health checks: does a hall's saved menu look like a real menu?

A hall that isn't closed must have items, and not fewer than half its recent
normal: the median item count of its comparable open days in the last
RECENT_DAYS days before the menu's day (the date its page shows). Weekend
menus (Continental/Brunch) are much smaller than weekday ones, so a weekend day
is compared only with recent weekend days and a weekday only with recent
weekdays. With no comparable
history (e.g. the first weekend after a deploy) there's nothing to compare
against, so that check is skipped. A run that finds a problem still saves what
it could, then fails (see `dinnr.run.ScrapeFailed`), so the scheduled GitHub
Actions run fails and the owner gets an email.
"""

from datetime import date
from statistics import median

from dinnr.menu_parser import Menu

RECENT_DAYS = 14
MIN_SHARE_OF_NORMAL = 0.5


def day_kind(day: date) -> str:
    """"weekend" (Saturday, Sunday) or "weekday": days of one kind serve comparable menus."""
    return "weekend" if day.weekday() >= 5 else "weekday"


def menu_problems(menu: Menu, item_count: int, recent_counts: dict[date, int]) -> list[str]:
    """Why this menu looks wrong (empty list if it looks healthy).

    `item_count` is the hall's saved item count on `menu.day`; `recent_counts`
    the saved item counts of its recent open days, by date.
    """
    if menu.closed:
        return []
    if item_count == 0:
        return [f"page has {len(menu.meal_periods)} meal period(s) but no menu items, and the hall isn't closed"]
    kind = day_kind(menu.day)
    comparable = [count for day, count in recent_counts.items() if day_kind(day) == kind]
    if comparable:
        normal = median(comparable)
        if item_count < MIN_SHARE_OF_NORMAL * normal:
            return [f"{item_count} menu items, under half of the recent {kind} normal ({normal:g})"]
    return []
