"""Menu parser: a pure function from a location page's HTML to structured data.

Page structure (see fixtures/unc/README.md): meal periods are the tabs of
`#menu-tabs`, each tab's `aria-controls` naming its panel. A panel holds
`.menu-station` blocks, whose name is the `button.toggle-menu-station-data`
text. Items are `li.menu-item-li` entries holding `<a data-recipe="ID">Name</a>`.
"""

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup, Tag


class MenuParseError(ValueError):
    """The page doesn't have the structure we expect."""


@dataclass(frozen=True)
class MenuItem:
    name: str
    recipe_id: int


@dataclass(frozen=True)
class Station:
    name: str
    items: list[MenuItem] = field(default_factory=list)


@dataclass(frozen=True)
class MealPeriod:
    name: str  # without hours, e.g. "Brunch"
    label: str  # the tab text, whitespace-normalized, e.g. "Brunch (11am-3pm)"
    stations: list[Station] = field(default_factory=list)


@dataclass(frozen=True)
class Menu:
    meal_periods: list[MealPeriod] = field(default_factory=list)


def _text(tag: Tag) -> str:
    return " ".join(tag.get_text(" ").split())


def _name_from_label(label: str) -> str:
    return re.sub(r"\s*\(.*\)\s*$", "", label).strip()


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
        meal_periods.append(MealPeriod(_name_from_label(label), label, _parse_stations(panel)))
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
            items.append(MenuItem(_text(link), recipe_id))
        stations.append(Station(_text(button), items))
    return stations
