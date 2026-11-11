"""Location config: the dining halls the scraper visits.

Adding a hall is a new entry here; every location page shares one structure,
so no hall-specific code is needed.
"""

from dataclasses import dataclass
from datetime import date, datetime
from zoneinfo import ZoneInfo

# Every hall is in Chapel Hill, so "today" is one date for all of them.
DINING_TZ = ZoneInfo("America/New_York")


def dining_today(now: datetime | None = None) -> date:
    """The date being served at the halls at `now` (default: the current time)."""
    return (now or datetime.now(DINING_TZ)).astimezone(DINING_TZ).date()


@dataclass(frozen=True)
class Location:
    slug: str
    name: str
    url: str


LOCATIONS: list[Location] = [
    Location("top-of-lenoir", "Top of Lenoir", "https://dining.unc.edu/locations/top-of-lenoir/"),
    Location("chase", "Chase", "https://dining.unc.edu/locations/chase/"),
]
