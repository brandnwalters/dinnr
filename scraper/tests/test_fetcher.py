"""Seam 1: the polite fetcher, the only component that does HTTP.

A fake transport stands in for the network, so nothing here touches UNC.
"""

import pytest

from dinnr.fetcher import DisallowedURLError, FetchError, PoliteFetcher

# UNC's rules as of the fixture capture (fixtures/unc/README.md).
UNC_ROBOTS = """\
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /*?date=*
Disallow: /*?pg=*
"""
LENOIR = "https://dining.unc.edu/locations/top-of-lenoir/"
UA = "dinnr/0.1.0 (+https://github.com/brandnwalters/dinnr; contact: bmwal@unc.edu)"


class FakeTransport:
    def __init__(self, robots=UNC_ROBOTS, robots_status=200, status=200):
        self.robots = robots
        self.robots_status = robots_status
        self.status = status
        self.calls: list[tuple[str, dict]] = []

    def __call__(self, url, headers):
        self.calls.append((url, dict(headers)))
        if url.endswith("/robots.txt"):
            return self.robots_status, self.robots
        return self.status, f"<html>{url}</html>"

    @property
    def urls(self):
        return [u for u, _ in self.calls]


class FakeClock:
    def __init__(self):
        self.now = 1000.0
        self.slept: list[float] = []

    def monotonic(self):
        return self.now

    def sleep(self, seconds):
        self.slept.append(seconds)
        self.now += seconds


def make(transport=None, clock=None, delay=5.0):
    transport = transport or FakeTransport()
    clock = clock or FakeClock()
    fetcher = PoliteFetcher(transport=transport, delay_seconds=delay, sleep=clock.sleep, monotonic=clock.monotonic)
    return fetcher, transport, clock


def test_returns_the_page_body():
    fetcher, _, _ = make()

    assert fetcher.get(LENOIR) == f"<html>{LENOIR}</html>"


def test_every_request_sends_the_polite_user_agent():
    fetcher, transport, _ = make()

    fetcher.get(LENOIR)

    assert transport.urls == ["https://dining.unc.edu/robots.txt", LENOIR]
    assert all(headers["User-Agent"] == UA for _, headers in transport.calls)


@pytest.mark.parametrize(
    "url",
    [
        "https://dining.unc.edu/locations/top-of-lenoir/?date=2026-11-08",
        "https://dining.unc.edu/locations/chase/?date=2026-11-08&x=1",
        "https://dining.unc.edu/locations/chase/?pg=2",
        "https://dining.unc.edu/wp-admin/options.php",
    ],
)
def test_refuses_urls_robots_txt_disallows(url):
    fetcher, transport, _ = make()

    with pytest.raises(DisallowedURLError):
        fetcher.get(url)

    assert url not in transport.urls


def test_never_requests_date_urls_even_if_robots_txt_allows_them():
    fetcher, transport, _ = make(FakeTransport(robots="User-agent: *\nDisallow:\n"))

    with pytest.raises(DisallowedURLError):
        fetcher.get(LENOIR + "?foo=1&date=2026-11-08")

    assert transport.urls == []


def test_allow_rules_override_a_broader_disallow():
    fetcher, transport, _ = make()

    fetcher.get("https://dining.unc.edu/wp-admin/admin-ajax.php")

    assert transport.urls[-1] == "https://dining.unc.edu/wp-admin/admin-ajax.php"


def test_robots_txt_is_fetched_once_per_host():
    fetcher, transport, _ = make()

    fetcher.get(LENOIR)
    fetcher.get("https://dining.unc.edu/locations/chase/")

    assert transport.urls.count("https://dining.unc.edu/robots.txt") == 1


def test_a_missing_robots_txt_allows_everything_but_date_urls():
    fetcher, transport, _ = make(FakeTransport(robots="", robots_status=404))

    fetcher.get(LENOIR)

    assert transport.urls[-1] == LENOIR


def test_an_unreachable_robots_txt_refuses_everything():
    fetcher, _, _ = make(FakeTransport(robots="", robots_status=503))

    with pytest.raises(DisallowedURLError):
        fetcher.get(LENOIR)


def test_waits_between_requests():
    fetcher, _, clock = make(delay=5.0)

    fetcher.get(LENOIR)
    fetcher.get("https://dining.unc.edu/locations/chase/")

    # robots.txt -> Lenoir -> Chase: each request at least 5 s after the previous one.
    assert clock.slept == [5.0, 5.0]


def test_time_already_spent_counts_towards_the_wait():
    fetcher, _, clock = make(delay=5.0)

    fetcher.get(LENOIR)
    clock.now += 3.0  # e.g. parsing and saving took 3 s
    fetcher.get("https://dining.unc.edu/locations/chase/")

    assert clock.slept == [5.0, 2.0]


def test_an_error_status_raises():
    fetcher, _, _ = make(FakeTransport(status=500))

    with pytest.raises(FetchError):
        fetcher.get(LENOIR)
