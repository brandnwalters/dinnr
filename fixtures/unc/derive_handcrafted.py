"""Derive the hand-crafted fixture pages from the real captured ones.

Run from anywhere: `python3 -I fixtures/unc/derive_handcrafted.py`. It only reads
the committed captures in this directory; it never touches the network.

- weekday-top-of-lenoir.html: the real Saturday Lenoir page with its meal tabs
  replaced by Breakfast / Lunch / Dinner. The tab panels are real panels taken
  from the captures (Lenoir Continental, Lenoir Brunch, Chase Dinner).
- closed-top-of-lenoir.html: the real Lenoir page with the whole `#menu-tabs`
  block removed (no meal periods), which is how the spec defines "closed".
"""

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent


def find_div_block(html: str, start_marker: str, from_index: int = 0) -> tuple[int, int]:
    """Return (start, end) of the balanced <div ...>...</div> beginning at start_marker."""
    start = html.index(start_marker, from_index)
    depth = 0
    for m in re.finditer(r"<div\b|</div>", html[start:]):
        depth += 1 if m.group(0) == "<div" else -1
        if depth == 0:
            return start, start + m.end()
    raise ValueError(f"unbalanced div at {start_marker!r}")


def tab_panel_contents(html: str) -> list[str]:
    """Inner HTML of each `c-tab__content` panel, in tab order."""
    tabs_start, tabs_end = find_div_block(html, '<div id="menu-tabs"')
    tabs = html[tabs_start:tabs_end]
    panels = []
    pos = 0
    while (i := tabs.find('<div class="c-tab__content">', pos)) != -1:
        s, e = find_div_block(tabs, '<div class="c-tab__content">', i)
        inner = tabs[s:e]
        panels.append(inner[len('<div class="c-tab__content">') : -len("</div>")])
        pos = e
    return panels


def build_tabs(periods: list[tuple[str, str]]) -> str:
    nav = []
    panels = []
    for n, (label, content) in enumerate(periods, start=1):
        active = n == 1
        nav.append(
            f'<button type="button" role="tab" aria-controls="tabinfo-{n}" id="tabid-{n}" '
            f'class="c-tabs-nav__link{" is-active" if active else ""}" data-tabid="{n - 1}"  '
            f'aria-expanded="{"true" if active else "false"}">\n'
            f'    <div class="c-tabs-nav__link-inner">{label}</div>\n</button>'
        )
        panels.append(
            f'<div role="tabpanel" id="tabinfo-{n}" aria-labelledby="tabid-{n}" class="c-tab">\n'
            f'<div class="c-tab__content">{content}</div>\n</div>'
        )
    return (
        '<div id="menu-tabs" class="c-tabs no-js">\n<div class="c-tabs-nav" role="tablist">\n'
        + "\n".join(nav)
        + "\n</div>\n"
        + "\n".join(panels)
        + "\n</div>"
    )


def main() -> None:
    lenoir = (HERE / "top-of-lenoir.html").read_text(encoding="utf-8")
    chase = (HERE / "chase.html").read_text(encoding="utf-8")

    lenoir_panels = tab_panel_contents(lenoir)  # Continental, Brunch
    chase_panels = tab_panel_contents(chase)  # Continental, Brunch, Late Lunch, Dinner

    start, end = find_div_block(lenoir, '<div id="menu-tabs"')
    weekday_tabs = build_tabs(
        [
            ("Breakfast (7am-10:30am)", lenoir_panels[0]),
            ("Lunch (11am-3pm)", lenoir_panels[1]),
            ("Dinner (5pm-8pm)", chase_panels[3]),
        ]
    )
    banner = "<!-- HAND-CRAFTED fixture: see fixtures/unc/README.md -->\n"
    (HERE / "weekday-top-of-lenoir.html").write_text(
        banner + lenoir[:start] + weekday_tabs + lenoir[end:], encoding="utf-8"
    )
    (HERE / "closed-top-of-lenoir.html").write_text(banner + lenoir[:start] + lenoir[end:], encoding="utf-8")


if __name__ == "__main__":
    main()
