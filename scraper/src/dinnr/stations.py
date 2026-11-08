"""Which stations are left out of meal combos, by a rule on the station name.

These stations hold add-ons rather than dishes (ketchup, milk, cereal), which
would otherwise make silly combos like "2x peanut butter". The rule matches
words anywhere in the name, case-insensitively, so variants such as "Beverage
Station" or "Condiments" are caught too.
"""

import re

_EXCLUDED_WORDS = re.compile(r"\b(condiments?|spreads?|beverages?|drinks?|cereals?)\b", re.IGNORECASE)


def excluded_from_combos(station_name: str) -> bool:
    return _EXCLUDED_WORDS.search(station_name) is not None
