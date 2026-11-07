"""Menu parser: a pure function from a location page's HTML to structured data.

Page structure (see fixtures/unc/README.md): meal periods are the tabs of
`#menu-tabs`, each tab's `aria-controls` naming its panel. A panel holds
`.menu-station` blocks, whose name is the `button.toggle-menu-station-data`
text. Items are `li.menu-item-li` entries holding `<a data-recipe="ID">Name</a>`; dietary tags
are the link's `prop-<code>` classes.
"""

import re
from dataclasses import dataclass, field
from datetime import time

from bs4 import BeautifulSoup, Tag


class MenuParseError(ValueError):
    """The page doesn't have the structure we expect."""


@dataclass(frozen=True)
class MenuItem:
    name: str
    recipe_id: int
    dietary_tags: tuple[str, ...] = ()  # `prop-<code>` codes in page order, e.g. ("vegan", "halal")

    @property
    def normalized_name(self) -> str:
        return normalize_name(self.name)


@dataclass(frozen=True)
class Station:
    name: str
    items: list[MenuItem] = field(default_factory=list)


@dataclass(frozen=True)
class MealPeriod:
    name: str  # without hours, e.g. "Brunch"
    label: str  # the tab text, whitespace-normalized, e.g. "Brunch (11am-3pm)"
    stations: list[Station] = field(default_factory=list)
    start: time | None = None  # local (America/New_York) wall-clock time; None if unreadable
    end: time | None = None


@dataclass(frozen=True)
class Menu:
    meal_periods: list[MealPeriod] = field(default_factory=list)

    @property
    def closed(self) -> bool:
        """A page with no meal periods means the hall is closed that day."""
        return not self.meal_periods


def normalize_name(name: str) -> str:
    """How favorites match a dish: lowercased, trimmed, whitespace collapsed."""
    return " ".join(name.split()).lower()


def _text(tag: Tag) -> str:
    return " ".join(tag.get_text(" ").split())


def _name_from_label(label: str) -> str:
    return re.sub(r"\s*\(.*\)\s*$", "", label).strip()


_CLOCK = r"(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?"
_HOURS = re.compile(rf"\(\s*{_CLOCK}\s*[-–—]\s*{_CLOCK}\s*\)\s*$", re.IGNORECASE)


def _clock(hour: str, minute: str | None, meridiem: str) -> time:
    h = int(hour) % 12 + (12 if meridiem.lower() == "p" else 0)
    return time(h, int(minute or 0))


def _hours_from_label(label: str) -> tuple[time | None, time | None]:
    """'Brunch (11am-3pm)' -> (11:00, 15:00); (None, None) if the label has no readable hours."""
    m = _HOURS.search(label)
    if m is None:
        return None, None
    return _clock(*m.group(1, 2, 3)), _clock(*m.group(4, 5, 6))


def _dietary_tags(link: Tag) -> tuple[str, ...]:
    return tuple(c.removeprefix("prop-") for c in link.get("class", []) if c.startswith("prop-"))


def parse_menu(html: str) -> Menu:
    soup = BeautifulSoup(html, "html.parser")
    tabs_root = soup.find(id="menu-tabs")
    if tabs_root is None:
        return Menu()

    meal_periods = []
    for tab in tabs_root.select('[role="tab"]'):
        panel = soup.find(id=tab.get("aria-controls"))
        if panel is None:
            raise MenuParseError(f"no panel for meal period tab {_text(tab)!r}")
        label = _text(tab)
        start, end = _hours_from_label(label)
        meal_periods.append(MealPeriod(_name_from_label(label), label, _parse_stations(panel), start, end))
    return Menu(meal_periods)


def _parse_stations(panel: Tag) -> list[Station]:
    stations = []
    for block in panel.select(".menu-station"):
        button = block.select_one("button.toggle-menu-station-data")
        if button is None:
            raise MenuParseError("menu station without a name button")
        items = []
        for link in block.select("li.menu-item-li a[data-recipe]"):
            try:
                recipe_id = int(link["data-recipe"])
            except ValueError as e:
                raise MenuParseError(f"non-numeric recipe id {link['data-recipe']!r}") from e
            items.append(MenuItem(_text(link), recipe_id, _dietary_tags(link)))
        stations.append(Station(_text(button), items))
    return stations
