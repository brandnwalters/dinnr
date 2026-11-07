"""Location config: the dining halls the scraper visits.

Adding a hall is a new entry here; every location page shares one structure,
so no hall-specific code is needed.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Location:
    slug: str
    name: str
    url: str


LOCATIONS: list[Location] = [
    Location("top-of-lenoir", "Top of Lenoir", "https://dining.unc.edu/locations/top-of-lenoir/"),
]
