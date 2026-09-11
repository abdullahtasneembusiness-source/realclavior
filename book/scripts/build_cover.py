#!/usr/bin/env python3
"""
Build the KDP cover from the book's own line art.

Plan A in the book plan: colour the interior drawings rather than generating a
separate cover image. The usual one-star complaint about activity books is
that the cover shows art the book doesn't contain, and this makes that
impossible — every truck on the front is a page inside.

The cover is one landscape PDF spanning back, spine and front, which is what
KDP expects for a paperback:

    +---------------+-------+---------------+
    |  back cover   | spine |  front cover  |
    +---------------+-------+---------------+

Spine width comes from KDP's own formula for black-and-white interiors on
white paper, and must be checked against their cover calculator once the page
count is final.

Usage:
    python3 book/scripts/build_cover.py
    python3 book/scripts/build_cover.py --pages 76 --bleed 0.125
"""

import argparse
import sys
from pathlib import Path

from reportlab.lib.colors import Color, black, white
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_pages import draw_art, register_fonts  # noqa: E402

HERE = Path(__file__).resolve().parent
BOOK = HERE.parent / "book1"
ART_CLEAN = BOOK / "art-clean"
OUT = BOOK.parent / "out"

TRIM_W, TRIM_H = 8.5 * inch, 11 * inch
# KDP: black-and-white interior on white paper is 0.002252 inches per page.
SPINE_PER_PAGE = 0.002252 * inch

SKY = Color(0.65, 0.85, 0.95)
SAND = Color(0.99, 0.86, 0.55)
BAND = Color(0.98, 0.76, 0.20)
INK = black


def _art(key: str) -> Path | None:
    p = ART_CLEAN / f"{key}.png"
    return p if p.exists() else None


def coloured(c, key: str, box, tint: Color):
    """
    Draw one interior illustration twice: a solid tint, then its black lines
    on top. The line art has no fillable regions of its own, so this reads as
    a flat colour behind the drawing rather than true colouring-in — which is
    what a chunky toddler cover wants anyway.
    """
    art = _art(key)
    if art is None:
        return False
    x, y, w, h = box
    draw_art(c, art, (x + 2.5, y - 2.5, w, h), fill=tint)
    draw_art(c, art, box, fill=INK)
    return True


def build(out: Path, pages: int, bleed: float) -> tuple[float, float]:
    spine = pages * SPINE_PER_PAGE
    bl = bleed * inch
    total_w = TRIM_W * 2 + spine + bl * 2
    total_h = TRIM_H + bl * 2

    register_fonts()
    c = canvas.Canvas(str(out), pagesize=(total_w, total_h))
    c.setTitle("Cut, Color & Build: Construction Site — cover")

    front_x = bl + TRIM_W + spine
    back_x = bl

    # Sky across the whole wrap, then a sand band along the bottom.
    c.setFillColor(SKY)
    c.rect(0, 0, total_w, total_h, stroke=0, fill=1)
    c.setFillColor(SAND)
    c.rect(0, 0, total_w, bl + TRIM_H * 0.30, stroke=0, fill=1)

    # --- front -------------------------------------------------------------
    c.setFillColor(BAND)
    c.roundRect(front_x + 0.5 * inch, bl + TRIM_H - 2.45 * inch,
                TRIM_W - 1.0 * inch, 1.75 * inch, 16, stroke=0, fill=1)
    c.setFillColor(INK)
    c.setFont("Fredoka-SemiBold", 19)
    c.drawCentredString(front_x + TRIM_W / 2, bl + TRIM_H - 1.25 * inch, "Cut, Color & Build")
    c.setFont("Fredoka-Bold", 44)
    c.drawCentredString(front_x + TRIM_W / 2, bl + TRIM_H - 2.05 * inch, "Construction Site")

    coloured(c, "a06", (front_x + 0.45 * inch, bl + TRIM_H * 0.36,
                        TRIM_W - 0.9 * inch, TRIM_H * 0.30), Color(0.96, 0.62, 0.15))
    coloured(c, "a01", (front_x + 0.5 * inch, bl + TRIM_H * 0.14,
                        TRIM_W * 0.44, TRIM_H * 0.20), Color(0.98, 0.80, 0.18))
    coloured(c, "a23", (front_x + TRIM_W * 0.62, bl + TRIM_H * 0.14,
                        TRIM_W * 0.26, TRIM_H * 0.20), Color(0.94, 0.35, 0.22))

    for i, (text, dy) in enumerate((("Scissor Skills for Ages 3–5", 0.95),
                                    ("35 Cutting Activities", 0.52))):
        bw, bh = 3.1 * inch, 0.36 * inch
        bx = front_x + TRIM_W / 2 - bw / 2
        by = bl + dy * inch
        c.setFillColor(white)
        c.setStrokeColor(INK)
        c.setLineWidth(2.4)
        c.roundRect(bx, by, bw, bh, 14, stroke=1, fill=1)
        c.setFillColor(INK)
        c.setFont("Fredoka-SemiBold", 13)
        c.drawCentredString(front_x + TRIM_W / 2, by + 11, text)

    # --- spine -------------------------------------------------------------
    if spine > 0.10 * inch:  # KDP only allows spine text from about 80 pages
        c.saveState()
        c.translate(bl + TRIM_W + spine / 2, bl + TRIM_H / 2)
        c.rotate(90)
        c.setFillColor(INK)
        c.setFont("Fredoka-SemiBold", 11)
        c.drawCentredString(0, -4, "Cut, Color & Build: Construction Site")
        c.restoreState()

    # --- back --------------------------------------------------------------
    c.setFillColor(white)
    c.roundRect(back_x + 0.6 * inch, bl + TRIM_H * 0.30,
                TRIM_W - 1.2 * inch, TRIM_H * 0.58, 18, stroke=0, fill=1)

    c.setFillColor(INK)
    c.setFont("Fredoka-Bold", 21)
    c.drawString(back_x + 0.95 * inch, bl + TRIM_H * 0.80,
                 "Your little builder is about")
    c.drawString(back_x + 0.95 * inch, bl + TRIM_H * 0.765,
                 "to become a scissor master!")

    c.setFont("Fredoka-Regular", 11.5)
    body = [
        "Cutting practice turned into a real construction project.",
        "Kids start with easy snips and move step by step to straight",
        "roads, zigzags, waves, shapes, and finally cut-and-glue",
        "projects where they build their own dump truck, excavator",
        "and building.",
    ]
    y = bl + TRIM_H * 0.715
    for line in body:
        c.drawString(back_x + 0.95 * inch, y, line)
        y -= 16

    bullets = [
        "35 cutting activities across 5 levels",
        "Big, bold trucks, diggers and cranes to color",
        "Single-sided pages, so cutting one never ruins the next",
        "An easy tear-out line on every page",
        "A Scissor Master certificate at the end",
    ]
    y -= 12
    for line in bullets:
        c.setFillColor(BAND)
        c.circle(back_x + 1.02 * inch, y + 4, 4.5, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Fredoka-Regular", 11.5)
        c.drawString(back_x + 1.22 * inch, y, line)
        y -= 19

    c.setFont("Fredoka-Regular", 9.5)
    c.drawString(back_x + 0.95 * inch, bl + TRIM_H * 0.345,
                 "Use with child-safe scissors and adult supervision.")

    c.showPage()
    c.save()
    return spine / inch, total_w / inch


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pages", type=int, default=76)
    ap.add_argument("--bleed", type=float, default=0.125)
    ap.add_argument("--out", type=Path, default=OUT / "cover.pdf")
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    spine, width = build(args.out, args.pages, args.bleed)
    print(f"cover → {args.out}")
    print(f"{args.pages} pages, spine {spine:.3f} in, wrap {width:.3f} x "
          f"{TRIM_H / inch + args.bleed * 2:.3f} in with {args.bleed} in bleed")
    print("Check the spine against KDP's cover calculator before uploading.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
