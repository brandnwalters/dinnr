"""Fetcher: the only component that does HTTP.

The rest of the scraper depends on the `Fetcher` protocol, so tests can inject
a fake (`dinnr.testing.FakeFetcher`) that serves saved fixture pages.

`PoliteFetcher` is the real one. It
- identifies itself with `USER_AGENT` (repo URL + contact email),
- waits `delay_seconds` between consecutive requests (robots.txt included),
- reads each host's robots.txt once and refuses any URL it disallows, and
- never requests a `?date=` URL, whatever robots.txt says.

The network itself is a `Transport` (url, headers) -> (status, body), injected
so the fetcher's politeness can be tested without touching the live site.
"""

import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from importlib.metadata import version
from typing import Protocol
from urllib.parse import parse_qs, urlsplit

REPO_URL = "https://github.com/brandnwalters/dinnr"
CONTACT = "bmwal@unc.edu"
USER_AGENT = f"dinnr/{version('dinnr')} (+{REPO_URL}; contact: {CONTACT})"
ROBOTS_AGENT = "dinnr"  # the product token matched against robots.txt groups

DEFAULT_DELAY_SECONDS = 5.0
TIMEOUT_SECONDS = 30

# Query parameters we never send, regardless of robots.txt (it disallows them today).
FORBIDDEN_QUERY_PARAMS = {"date"}


class Fetcher(Protocol):
    def get(self, url: str) -> str:
        """Return the response body for `url`."""
        ...


class FetchError(RuntimeError):
    """The server answered with an error status."""


class DisallowedURLError(FetchError):
    """We refused to request this URL (robots.txt or our own rules)."""


Transport = Callable[[str, dict[str, str]], tuple[int, str]]


def urllib_transport(url: str, headers: dict[str, str]) -> tuple[int, str]:
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.status, response.read().decode(charset, errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, ""


class PoliteFetcher:
    def __init__(
        self,
        transport: Transport = urllib_transport,
        delay_seconds: float = DEFAULT_DELAY_SECONDS,
        sleep: Callable[[float], None] = time.sleep,
        monotonic: Callable[[], float] = time.monotonic,
    ):
        self._transport = transport
        self._delay = delay_seconds
        self._sleep = sleep
        self._monotonic = monotonic
        self._last_request_at: float | None = None
        self._robots: dict[str, RobotsRules] = {}

    def get(self, url: str) -> str:
        parts = urlsplit(url)
        if FORBIDDEN_QUERY_PARAMS & parse_qs(parts.query, keep_blank_values=True).keys():
            raise DisallowedURLError(f"refusing {url}: we never request ?date= URLs")
        rules = self._robots_for(f"{parts.scheme}://{parts.netloc}")
        path = parts.path or "/"
        if parts.query:
            path += "?" + parts.query
        if not rules.allows(path):
            raise DisallowedURLError(f"refusing {url}: disallowed by robots.txt")
        status, body = self._request(url)
        if status != 200:
            raise FetchError(f"GET {url} returned HTTP {status}")
        return body

    def _robots_for(self, origin: str) -> "RobotsRules":
        if origin not in self._robots:
            status, body = self._request(origin + "/robots.txt")
            if status == 200:
                rules = RobotsRules.parse(body, ROBOTS_AGENT)
            elif 400 <= status < 500:
                rules = RobotsRules.allow_all()  # no robots.txt: no restrictions (RFC 9309)
            else:
                rules = RobotsRules.disallow_all()  # unreachable: assume complete disallow
            self._robots[origin] = rules
        return self._robots[origin]

    def _request(self, url: str) -> tuple[int, str]:
        if self._last_request_at is not None:
            wait = self._delay - (self._monotonic() - self._last_request_at)
            if wait > 0:
                self._sleep(wait)
        try:
            return self._transport(url, {"User-Agent": USER_AGENT})
        finally:
            self._last_request_at = self._monotonic()


class RobotsRules:
    """robots.txt rules for one agent, with `*` / `$` wildcards (RFC 9309).

    The longest matching rule wins; on a tie, Allow wins.
    """

    def __init__(self, rules: list[tuple[bool, str]]):
        self._rules = [(allow, pattern, _compile(pattern)) for allow, pattern in rules if pattern]

    @classmethod
    def allow_all(cls) -> "RobotsRules":
        return cls([])

    @classmethod
    def disallow_all(cls) -> "RobotsRules":
        return cls([(False, "/")])

    @classmethod
    def parse(cls, text: str, agent: str) -> "RobotsRules":
        groups: list[tuple[list[str], list[tuple[bool, str]]]] = []
        in_agents = False
        for raw in text.splitlines():
            line = raw.split("#", 1)[0].strip()
            if ":" not in line:
                continue
            key, value = (s.strip() for s in line.split(":", 1))
            key = key.lower()
            if key == "user-agent":
                if not in_agents:
                    groups.append(([], []))
                groups[-1][0].append(value.lower())
                in_agents = True
            elif key in ("allow", "disallow") and groups:
                groups[-1][1].append((key == "allow", value))
                in_agents = False
            else:
                in_agents = False

        mine = [rules for agents, rules in groups if agent.lower() in agents]
        if not mine:
            mine = [rules for agents, rules in groups if "*" in agents]
        return cls([rule for rules in mine for rule in rules])

    def allows(self, path: str) -> bool:
        best: tuple[int, bool] | None = None
        for allow, pattern, regex in self._rules:
            if regex.match(path):
                candidate = (len(pattern), allow)
                if best is None or candidate > best:
                    best = candidate
        return best is None or best[1]


def _compile(pattern: str) -> re.Pattern[str]:
    anchored = pattern.endswith("$")
    body = pattern[:-1] if anchored else pattern
    regex = ".*".join(re.escape(part) for part in body.split("*"))
    return re.compile(regex + ("$" if anchored else ""))
