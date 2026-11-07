"""Raw archive: keep a gzipped copy of every page a scrape run fetched.

Wrapping the fetcher means each page is saved as soon as it arrives, before
parsing, so a page that breaks the parser is still kept for re-processing.

Layout: `<archive dir>/<run timestamp, UTC>/<name>.gz`, e.g.
`archive/20261107T093000Z/top-of-lenoir.html.gz` for a location page and
`.../recipe-8260.json.gz` for a nutrition response.

The scheduled workflow uploads the folder as a GitHub Actions artifact
(90-day retention); see docs/deploy.md.
"""

import gzip
import re
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from dinnr.fetcher import Fetcher
from dinnr.locations import Location


class ArchivingFetcher:
    """A `Fetcher` that passes requests to `inner` and saves each response gzipped."""

    def __init__(self, inner: Fetcher, archive_dir: Path, *, run_at: datetime, locations: Iterable[Location]):
        self.inner = inner
        self.run_dir = Path(archive_dir) / run_at.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
        self._slugs = {location.url: location.slug for location in locations}

    def get(self, url: str) -> str:
        body = self.inner.get(url)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / f"{self._name_for(url)}.gz").write_bytes(gzip.compress(body.encode()))
        return body

    def _name_for(self, url: str) -> str:
        if url in self._slugs:
            return f"{self._slugs[url]}.html"
        parts = urlsplit(url)
        recipe = parse_qs(parts.query).get("recipe")
        if parts.path.endswith("/recipe.php") and recipe:
            return f"recipe-{_safe(recipe[0])}.json"
        return _safe(parts.netloc + parts.path + ("_" + parts.query if parts.query else ""))


def _safe(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", text).strip("_") or "page"
