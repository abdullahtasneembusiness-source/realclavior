#!/usr/bin/env python3
"""
Assemble the full 76-page interior PDF for KDP.

    page 1      title
    page 2      copyright
    page 3      Hello, Parents!
    page 4      this book belongs to, plus the level map
    pages 5-74  the 35 activities, each on an odd page with a blank back
    page 75     Scissor Master certificate
    page 76     blank

Activities sit on odd pages only, so cutting one page never destroys the
activity printed behind it. That is the reason for 76 pages rather than 41,
and the blank backs say so in as many words, because a buyer flicking
through a sample otherwise sees half the book empty and assumes a misprint.

Usage:
    python3 book/scripts/build_book.py
    python3 book/scripts/build_book.py --out book/out/interior.pdf
"""

import argparse
import json
import sys
from pathlib import Path

from reportlab.lib.colors import black
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

sys.path.insert(0, str(Path(__file__).resolve().parent))

from pieces import PIECES  # noqa: E402
from build_pages import (  # noqa: E402
    ART_CLEAN,
    art_path,
    place,
    CONTENT_L,
    CONTENT_R,
    CONTENT_W,
    M_BOTTOM,
    M_TOP,
    PAGE_H,
    PAGE_W,
    TEAR_X,
    draw_activity,
    draw_art,
    draw_scissors,
    register_fonts,
)

BOOK = Path(__file__).resolve().parent.parent / "book1"
OUT = BOOK.parent / "out"

# The imprint name: the copyright line, the PDF author field, and the name
# KDP checks against the account all read from here.
BRAND = "Little Snippers Press"
YEAR = 2026


def _art(key: str) -> Path | None:
    """Front matter borrows interior illustrations, which are raster only."""
    return art_path(key)


def _have(key: str) -> bool:
    """Code-drawn pieces are always available; generated art may not be."""
    return key in PIECES or art_path(key) is not None


def page_title(c, data):
    art = _art("a06")
    if art:
        draw_art(c, art, (CONTENT_L, PAGE_H * 0.30, CONTENT_W, PAGE_H * 0.32))

    c.setFillColor(black)
    c.setFont("Fredoka-SemiBold", 20)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.5 * inch, data["series"])
    c.setFont("Fredoka-Bold", 40)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 2.25 * inch, "Construction Site")
    c.setFont("Fredoka-Regular", 15)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 2.8 * inch, "Scissor Skills for Ages 3 to 5")
    c.setFont("Fredoka-SemiBold", 15)
    c.drawCentredString(PAGE_W / 2, PAGE_H * 0.22, "35 Cutting Activities")


def page_copyright(c, data):
    c.setFillColor(black)
    c.setFont("Fredoka-Regular", 10)
    lines = [
        f"Copyright © {YEAR} {BRAND}. All rights reserved.",
        "",
        "No part of this book may be reproduced or distributed in any form",
        "without the written permission of the copyright holder.",
        "",
        f"{data['series']}: Construction Site",
        "Illustrations generated with AI and prepared for print.",
        "",
        "Use with child-safe scissors and adult supervision.",
    ]
    y = PAGE_H / 2 + 60
    for line in lines:
        c.drawString(CONTENT_L, y, line)
        y -= 15


def page_parents(c, data):
    c.setFillColor(black)
    c.setFont("Fredoka-Bold", 26)
    c.drawString(CONTENT_L, PAGE_H - M_TOP - 30, "Hello, Parents!")

    body = [
        ("How to use this book", None),
        (None, "Tear out the page along the dashed line near the spine. Every activity"),
        (None, "is printed on its own page, so cutting one never ruins the next."),
        (None, ""),
        ("Color first, then cut", None),
        (None, "Coloring warms up the same small muscles cutting needs, and it gives"),
        (None, "your child something they made before the scissors come out."),
        (None, ""),
        ("Go at your child's pace", None),
        (None, "The five levels build up from single snips to cut-and-glue projects."),
        (None, "Repeat a level as often as you like. There is no order to keep to,"),
        (None, "and a child who wants the same page four times is practicing."),
        (None, ""),
        ("Stay close", None),
        (None, "Use child-safe scissors and supervise every session. Little hands tire"),
        (None, "quickly, so short and often beats one long sitting."),
    ]
    y = PAGE_H - M_TOP - 75
    for heading, line in body:
        if heading:
            c.setFont("Fredoka-SemiBold", 14)
            c.drawString(CONTENT_L, y, heading)
            y -= 19
        else:
            c.setFont("Fredoka-Regular", 11.5)
            c.drawString(CONTENT_L, y, line)
            y -= 16


def page_belongs(c, data):
    c.setFillColor(black)
    c.setFont("Fredoka-Bold", 28)
    c.drawCentredString(PAGE_W / 2, PAGE_H - M_TOP - 40, "This book belongs to")

    c.setLineWidth(2.5)
    c.setStrokeColor(black)
    c.setDash()
    y = PAGE_H - M_TOP - 110
    c.line(CONTENT_L + 40, y, CONTENT_R - 40, y)

    c.setFont("Fredoka-SemiBold", 17)
    c.drawCentredString(PAGE_W / 2, y - 60, "Your five levels")

    top = y - 100
    for level in data["levels"]:
        lo, hi = level["activities"]
        c.saveState()
        c.setLineWidth(2)
        c.roundRect(CONTENT_L + 30, top - 40, CONTENT_W - 60, 46, 12, stroke=1, fill=0)
        c.restoreState()

        c.setFont("Fredoka-Bold", 15)
        c.drawString(CONTENT_L + 48, top - 14, f"Level {level['level']}")
        c.setFont("Fredoka-SemiBold", 15)
        c.drawString(CONTENT_L + 125, top - 14, level["name"])
        c.setFont("Fredoka-Regular", 10.5)
        c.drawString(CONTENT_L + 48, top - 31, f"Activities {lo} to {hi} — {level['note']}")
        top -= 62


def page_blank_back(c, data):
    """The back of an activity. Empty by design, and it says why."""
    c.setFillColor(black)
    c.setFont("Fredoka-Regular", 9)
    c.drawCentredString(
        PAGE_W / 2,
        M_BOTTOM,
        "This page is left blank so cutting won't ruin your next activity.",
    )


def page_certificate(c, data):
    art = _art("a25")
    if art:
        draw_art(c, art, (PAGE_W / 2 - 1.3 * inch, PAGE_H - 4.3 * inch, 2.6 * inch, 1.7 * inch))

    c.saveState()
    c.setLineWidth(4)
    c.setStrokeColor(black)
    c.setDash(12, 7)
    c.rect(0.9 * inch, 0.9 * inch, PAGE_W - 1.8 * inch, PAGE_H - 1.8 * inch, stroke=1, fill=0)
    c.restoreState()

    c.setFillColor(black)
    c.setFont("Fredoka-Bold", 34)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.9 * inch, "Scissor Master")
    c.setFont("Fredoka-SemiBold", 17)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 2.35 * inch, "Certificate")

    c.setFont("Fredoka-SemiBold", 19)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 5.0 * inch, "I finished all 35 activities!")

    c.setLineWidth(2.5)
    for label, y in (("Name", PAGE_H - 6.1 * inch), ("Date", PAGE_H - 7.3 * inch)):
        c.line(1.9 * inch, y, PAGE_W - 1.9 * inch, y)
        c.setFont("Fredoka-Regular", 11)
        c.drawString(1.9 * inch, y - 16, label)

    draw_scissors(c, PAGE_W / 2 - 8, 1.7 * inch, 22)


FRONT = {1: page_title, 2: page_copyright, 3: page_parents, 4: page_belongs}


def build_book(out: Path) -> int:
    data = json.loads((BOOK / "activities.json").read_text())
    levels = {l["level"]: l for l in data["levels"]}
    by_page = {a["page"]: a for a in data["activities"]}

    missing = []
    for a in data["activities"]:
        keys = [a["image"]] if a.get("image") else []
        keys += [b["img"] for b in a.get("build", [])]
        keys += [p["img"] for p in a.get("scene", [])]
        keys += [s["img"] for s in a.get("cut", {}).get("slots", [])]
        missing += [k for k in keys if not _have(k)]
    if missing:
        print(f"warning: {len(set(missing))} illustration(s) not generated yet: "
              f"{', '.join(sorted(set(missing)))}")
        print("Those pages will print with their guides but no drawing.")

    register_fonts()
    c = canvas.Canvas(str(out), pagesize=(PAGE_W, PAGE_H))
    c.setTitle(f"{data['series']}: Construction Site")
    c.setAuthor(BRAND)
    c.setSubject("Scissor skills activity book for ages 3 to 5")

    for page in range(1, 77):
        if page in FRONT:
            FRONT[page](c, data)
        elif page in by_page:
            draw_activity(c, by_page[page], levels)
        elif page == 75:
            page_certificate(c, data)
        elif page == 76:
            pass  # the back cover's facing page, genuinely empty
        else:
            page_blank_back(c, data)
        c.showPage()

    c.save()
    return 76


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=OUT / "interior.pdf")
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    n = build_book(args.out)
    size = args.out.stat().st_size / 1024
    print(f"{n} pages, {size:.0f} KB → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
