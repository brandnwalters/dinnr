"""Recipe nutrition: the recipe.php URL, a pure parser for its response, and the cache policy.

`recipe.php?recipe=<id>` returns JSON `{"success": ..., "html": "<label fragment>"}`.
The fragment has the recipe name in `<h2>`, a `table.nutrition-facts-table` whose
`<th>` cells read "<Label> <amount> <unit>" (the first one "Amount Per Serving
<serving size>"), and a `<p><strong>Ingredients:</strong> ...</p>`.
"""

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from bs4 import BeautifulSoup

RECIPE_URL = "https://dining.unc.edu/wp-content/themes/nmc_dining/ajax-content/recipe.php?recipe={id}"

# Nutrition older than this is fetched again.
MAX_AGE = timedelta(days=30)

# Label text -> Nutrition field, for the fixed facts. Any other row is a micronutrient.
MACROS = {
    "Calories": "calories",
    "Total Fat": "total_fat_g",
    "Saturated Fat": "saturated_fat_g",
    "Trans Fat": "trans_fat_g",
    "Cholesterol": "cholesterol_mg",
    "Sodium": "sodium_mg",
    "Total Carbohydrate": "total_carbohydrate_g",
    "Dietary Fiber": "dietary_fiber_g",
    "Sugars": "sugars_g",
    "Added Sugar": "added_sugar_g",
    "Protein": "protein_g",
}

# "<Label> <amount> <unit>"; the amount may be missing or a placeholder like "- -".
_ROW = re.compile(r"^(?P<label>[A-Za-z][A-Za-z ]*)(?P<rest>.*)$")
_AMOUNT = re.compile(r"\d+(?:\.\d+)?")
_UNIT = re.compile(r"\b(mcg|mg|g)\b")


class NutritionParseError(ValueError):
    """The recipe response doesn't have the structure we expect."""


@dataclass(frozen=True)
class Micronutrient:
    name: str
    amount: Decimal | None
    unit: str | None


@dataclass(frozen=True)
class Nutrition:
    name: str | None = None
    serving_size: str | None = None
    calories: Decimal | None = None
    total_fat_g: Decimal | None = None
    saturated_fat_g: Decimal | None = None
    trans_fat_g: Decimal | None = None
    cholesterol_mg: Decimal | None = None
    sodium_mg: Decimal | None = None
    total_carbohydrate_g: Decimal | None = None
    dietary_fiber_g: Decimal | None = None
    sugars_g: Decimal | None = None
    added_sugar_g: Decimal | None = None
    protein_g: Decimal | None = None
    micronutrients: list[Micronutrient] = field(default_factory=list)
    ingredients: str | None = None


def recipe_url(recipe_id: int) -> str:
    return RECIPE_URL.format(id=recipe_id)


def needs_fetch(fetched_at: datetime | None, now: datetime) -> bool:
    """Cache policy: fetch recipes never fetched, or fetched more than MAX_AGE ago."""
    return fetched_at is None or now - fetched_at > MAX_AGE


def _text(tag) -> str:
    return " ".join(tag.get_text(" ").split())


def _amount(text: str) -> Decimal | None:
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def parse_nutrition(body: str) -> Nutrition:
    try:
        data = json.loads(body)
    except json.JSONDecodeError as e:
        raise NutritionParseError(f"recipe response is not JSON: {e}") from e
    if not isinstance(data, dict) or not data.get("success") or not isinstance(data.get("html"), str):
        raise NutritionParseError("recipe response has no nutrition label")

    soup = BeautifulSoup(data["html"], "html.parser")
    table = soup.select_one("table.nutrition-facts-table")
    if table is None:
        raise NutritionParseError("recipe response has no nutrition-facts table")

    facts: dict = {}
    micronutrients = []
    for th in table.find_all("th"):
        text = _text(th)
        if text.startswith("Amount Per Serving"):
            facts["serving_size"] = text.removeprefix("Amount Per Serving").strip() or None
            continue
        match = _ROW.match(text)
        if match is None:
            continue
        label, rest = match["label"].strip(), match["rest"]
        amount_match, unit = _AMOUNT.search(rest), _UNIT.search(rest)
        amount = _amount(amount_match[0]) if amount_match else None
        if label in MACROS:
            facts[MACROS[label]] = amount
        else:
            micronutrients.append(Micronutrient(label, amount, unit[1] if unit else None))

    ingredients = None
    for p in soup.find_all("p"):
        strong = p.find("strong")
        if strong is not None and _text(strong).rstrip(":") == "Ingredients":
            strong.extract()
            ingredients = _text(p) or None
            break

    title = soup.find("h2")
    return Nutrition(
        name=_text(title) if title else None,
        micronutrients=micronutrients,
        ingredients=ingredients,
        **facts,
    )
