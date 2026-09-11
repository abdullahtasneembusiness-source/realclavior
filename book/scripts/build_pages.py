#!/usr/bin/env python3
"""
Draw activity pages for "Cut, Color & Build: Construction Site".

Everything on the page except the illustration is drawn here: the title, the
level badge, the cutting lines and their scissor icons, the tear-out line, the
frame and the footer. Flux never draws text, because AI lettering prints as
broken glyphs.

The illustration is traced to Bezier curves and drawn as vector paths rather
than placed as a bitmap, so the outlines stay crisp at any size instead of
softening to the 235dpi that a 1408px image would give across a 6 inch page.

Usage:
    python3 book/scripts/build_pages.py 6 23 29        # these activities
    python3 book/scripts/build_pages.py --all          # every activity with art
"""

import argparse
import json
import math
from functools import lru_cache
from pathlib import Path

import numpy as np
import potrace
from PIL import Image
from reportlab.lib.colors import Color, black, white
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import FILL_EVEN_ODD

from pieces import draw_piece

HERE = Path(__file__).resolve().parent
BOOK = HERE.parent / "book1"
ART_CLEAN = BOOK / "art-clean"
FONTS = HERE.parent / "assets" / "fonts"
OUT = HERE.parent / "out"

# --- Page geometry, all in points (72 to the inch) -------------------------
PAGE_W, PAGE_H = 8.5 * inch, 11 * inch
# Activities all sit on odd pages, so the spine is always on the left.
M_SPINE, M_OUTER, M_TOP, M_BOTTOM = 0.75 * inch, 0.5 * inch, 0.5 * inch, 0.5 * inch
TEAR_X = 0.75 * inch

# The plan puts the inside margin and the tear-out line at the same 0.75in,
# which leaves artwork sitting on top of the dashes. Content starts clear of
# the line instead.
CONTENT_L = TEAR_X + 0.18 * inch
CONTENT_R = PAGE_W - M_OUTER
CONTENT_W = CONTENT_R - CONTENT_L

# Dash patterns and stroke weights per level, heaviest for the youngest hands.
LEVEL_STROKE = {1: 5.0, 2: 4.2, 3: 3.4, 4: 3.0, 5: 2.4}
LEVEL_DASH = {1: (10, 7), 2: (11, 8), 3: (9, 7), 4: (8, 6), 5: (7, 5)}


def register_fonts() -> None:
    for weight in ("Regular", "SemiBold", "Bold"):
        pdfmetrics.registerFont(TTFont(f"Fredoka-{weight}", FONTS / f"Fredoka-{weight}.ttf"))


# --- Illustration ----------------------------------------------------------


@lru_cache(maxsize=64)
def trace(png: Path) -> tuple[potrace.Path, tuple[int, int, int, int]]:
    """
    Trace a cleaned black-on-white bitmap into curves, with the bounding box
    of the ink.

    Flux centres its subject inside a generous margin of its own, so fitting
    the whole frame to the page leaves the drawing floating small in the
    middle of it. The bounding box is what actually gets fitted.
    """
    a = np.asarray(Image.open(png).convert("L"))
    # Bitmap thresholds at blacklevel and then inverts, so handing it the
    # grayscale directly is what makes the *black* pixels the traced shape.
    # Passing a "True means ink" mask traces the white background instead.
    bitmap = potrace.Bitmap(a)

    ys, xs = np.nonzero(a < 128)
    bbox = (
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        if xs.size
        else (0, 0, a.shape[1], a.shape[0])
    )
    return bitmap.trace(), bbox


def draw_art(
    c: canvas.Canvas,
    png: Path,
    box: tuple[float, float, float, float],
    fill=black,
) -> None:
    """Draw the traced illustration to fit inside (x, y, w, h), centred."""
    path, (ix0, iy0, ix1, iy1) = trace(png)
    iw, ih = ix1 - ix0, iy1 - iy0
    bx, by, bw, bh = box
    scale = min(bw / iw, bh / ih)
    # Bitmap y runs downward and PDF y runs upward, so flip while placing.
    # The extra ix0/iy0 terms shift the ink's corner onto the box's corner.
    ox = bx + (bw - iw * scale) / 2 - ix0 * scale
    oy = by + (bh - ih * scale) / 2 + ih * scale + iy0 * scale

    def pt(p):
        return ox + p.x * scale, oy - p.y * scale

    c.saveState()
    c.setFillColor(fill)
    p = c.beginPath()
    for curve in path:
        p.moveTo(*pt(curve.start_point))
        for seg in curve:
            if seg.is_corner:
                p.lineTo(*pt(seg.c))
                p.lineTo(*pt(seg.end_point))
            else:
                p.curveTo(*pt(seg.c1), *pt(seg.c2), *pt(seg.end_point))
        p.close()
    # Even-odd, so the holes potrace nests inside a shape stay open
    # regardless of which way round each contour was wound.
    c.drawPath(p, stroke=0, fill=1, fillMode=FILL_EVEN_ODD)
    c.restoreState()


# --- Page furniture --------------------------------------------------------


def draw_scissors(c: canvas.Canvas, x: float, y: float, size: float = 13) -> None:
    """A small scissor mark showing which end of a cutting line to start at."""
    c.saveState()
    c.setLineWidth(1.5)
    c.setStrokeColor(black)
    c.setFillColor(black)
    s = size / 13.0
    # Two crossed blades, then the finger loops beneath them.
    c.line(x, y, x + 9 * s, y + 5 * s)
    c.line(x, y + 5 * s, x + 9 * s, y)
    c.circle(x - 1.6 * s, y - 1.2 * s, 2.1 * s, stroke=1, fill=0)
    c.circle(x - 1.6 * s, y + 6.2 * s, 2.1 * s, stroke=1, fill=0)
    c.restoreState()


def draw_tear_line(c: canvas.Canvas) -> None:
    c.saveState()
    c.setStrokeColor(black)
    c.setLineWidth(0.9)
    c.setDash(3, 4)
    c.line(TEAR_X, M_BOTTOM * 0.6, TEAR_X, PAGE_H - M_TOP * 0.6)
    c.restoreState()

    c.saveState()
    c.setFont("Fredoka-Regular", 7.5)
    c.setFillColor(black)
    c.translate(TEAR_X - 5, PAGE_H / 2)
    c.rotate(90)
    c.drawCentredString(0, 0, "Cut here to remove page")
    c.restoreState()


def draw_header(c: canvas.Canvas, title: str, level: int, level_name: str) -> float:
    """Title left, level badge right. Returns the y below the header."""
    top = PAGE_H - M_TOP

    badge_text = f"Level {level} • {level_name}"
    c.setFont("Fredoka-SemiBold", 9)
    tw = c.stringWidth(badge_text, "Fredoka-SemiBold", 9)
    bw, bh = tw + 18, 19
    bx, by = CONTENT_R - bw, top - bh

    c.saveState()
    c.setLineWidth(1.6)
    c.setStrokeColor(black)
    c.setFillColor(white)
    c.roundRect(bx, by, bw, bh, 9, stroke=1, fill=1)
    c.setFillColor(black)
    c.drawCentredString(bx + bw / 2, by + 6, badge_text)
    c.restoreState()

    # Shrink the title until it clears the badge on one line.
    size = 25
    avail = (bx - 10) - CONTENT_L
    while size > 13 and c.stringWidth(title, "Fredoka-Bold", size) > avail:
        size -= 1
    c.setFont("Fredoka-Bold", size)
    c.setFillColor(black)
    c.drawString(CONTENT_L, top - bh + 4, title)

    return by - 14


def draw_footer(c: canvas.Canvas, page: int) -> None:
    c.setFont("Fredoka-Regular", 9)
    c.setFillColor(black)
    c.drawString(CONTENT_L, M_BOTTOM - 2, "Color first, then cut!")
    c.drawRightString(CONTENT_R, M_BOTTOM - 2, str(page))


# --- Cutting guides --------------------------------------------------------


def _dashed(c: canvas.Canvas, level: int):
    c.setStrokeColor(black)
    c.setLineWidth(LEVEL_STROKE[level])
    c.setDash(*LEVEL_DASH[level])
    c.setLineCap(1)


def cut_snip(c, level, box, spec):
    """Level 1: short snips rising from the bottom edge of the work area."""
    x0, y0, w, h = box
    n = spec.get("count", 8)
    length = 1.5 * inch
    gap = w / n
    for i in range(n):
        x = x0 + gap * (i + 0.5)
        c.saveState(); _dashed(c, level)
        c.line(x, y0, x, y0 + length)
        c.restoreState()
        draw_scissors(c, x - 4.5, y0 - 15)


def cut_straight(c, level, box, spec):
    x0, y0, w, h = box
    n = spec.get("count", 3)
    orient = spec.get("orientation", "horizontal")
    c.saveState(); _dashed(c, level)
    if orient == "vertical":
        for i in range(n):
            x = x0 + w * (i + 0.5) / n
            c.line(x, y0 + 10, x, y0 + h - 10)
        c.restoreState()
        for i in range(n):
            draw_scissors(c, x0 + w * (i + 0.5) / n - 4.5, y0 - 6)
        return
    tight = 0.62 if "closer" in (spec.get("note") or "") else 1.0
    span = h * tight
    base = y0 + (h - span) / 2
    ys = [base + span * (i + 0.5) / n for i in range(n)]
    for i, y in enumerate(ys):
        if orient == "diagonal":
            c.line(x0, y - 24, x0 + w, y + 24)
        else:
            c.line(x0, y, x0 + w, y)
    c.restoreState()
    for i, y in enumerate(ys):
        draw_scissors(c, x0 - 16, (y - 24 if orient == "diagonal" else y) - 2.5)


def cut_corner(c, level, box, spec):
    """A straight run that turns one right angle."""
    x0, y0, w, h = box
    n = spec.get("count", 3)
    c.saveState(); _dashed(c, level)
    ys = [y0 + h * (i + 0.5) / n for i in range(n)]
    for i, y in enumerate(ys):
        turn = x0 + w * (0.45 + 0.12 * i)
        rise = h / (n * 2.6)
        p = c.beginPath()
        p.moveTo(x0, y)
        p.lineTo(turn, y)
        p.lineTo(turn, y + rise)
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()
    for y in ys:
        draw_scissors(c, x0 - 16, y - 2.5)


def _wiggle(c, level, box, spec, fn, n=None):
    """Shared plotter for the level 3 paths: sample fn across the width."""
    x0, y0, w, h = box
    n = n or spec.get("count", 3)
    ys = [y0 + h * (i + 0.5) / n for i in range(n)]
    c.saveState(); _dashed(c, level)
    for y in ys:
        p = c.beginPath()
        p.moveTo(x0, y + fn(0.0))
        steps = 160
        for s in range(1, steps + 1):
            t = s / steps
            p.lineTo(x0 + w * t, y + fn(t))
        c.drawPath(p, stroke=1, fill=0)
    c.restoreState()
    for y in ys:
        draw_scissors(c, x0 - 16, y + fn(0.0) - 2.5)


def cut_zigzag(c, level, box, spec):
    amp, cycles = 17, 5
    def fn(t):
        u = (t * cycles) % 1.0
        return amp * (4 * abs(u - 0.5) - 1)
    _wiggle(c, level, box, spec, fn)


def cut_wave(c, level, box, spec):
    tight = "tighter" in (spec.get("note") or "")
    amp, cycles = (13, 6) if tight else (17, 3)
    _wiggle(c, level, box, spec, lambda t: amp * math.sin(2 * math.pi * cycles * t))


def cut_curve(c, level, box, spec):
    _wiggle(c, level, box, spec, lambda t: 20 * math.sin(math.pi * t))


def cut_scurve(c, level, box, spec):
    _wiggle(c, level, box, spec, lambda t: 22 * math.sin(2 * math.pi * t))


def cut_arc(c, level, box, spec):
    _wiggle(c, level, box, spec, lambda t: 30 * math.sin(math.pi * t) - 15)


def cut_steps(c, level, box, spec):
    def fn(t):
        return 15 * math.floor(t * 5)
    _wiggle(c, level, box, spec, fn, n=spec.get("count", 2))


def cut_mixed(c, level, box, spec):
    """Straight for the first half, then zigzag."""
    def fn(t):
        if t < 0.5:
            return 0.0
        u = ((t - 0.5) * 8) % 1.0
        return 15 * (4 * abs(u - 0.5) - 1)
    _wiggle(c, level, box, spec, fn, n=spec.get("count", 2))


def cut_path(c, level, box, spec):
    """Activity 35: one long route mixing every path the book has taught."""
    def fn(t):
        if t < 0.25:
            return 0.0
        if t < 0.5:
            u = ((t - 0.25) * 8) % 1.0
            return 16 * (4 * abs(u - 0.5) - 1)
        if t < 0.75:
            return 16 * math.sin(2 * math.pi * (t - 0.5) * 4)
        return 22 * math.sin(math.pi * (t - 0.75) * 2)
    _wiggle(c, level, box, spec, fn, n=1)


SHAPES = ("square", "rectangle", "triangle", "circle", "halfcircle", "diamond", "mixed")

# How much of each cutting shape the drawing inside it may fill. A triangle
# or a diamond encloses far less than its bounding square does.
SHAPE_FIT = {"square": 0.86, "rectangle": 0.84, "circle": 0.70,
             "triangle": 0.70, "diamond": 0.60, "halfcircle": 0.64}


def cut_shape(c, level, box, spec, art: Path | None = None, art_for=None):
    """Level 4: a dashed outline around each object, two by two."""
    x0, y0, w, h = box
    n = spec.get("count", 4)
    shape = spec.get("shape", "square")
    cols = 2
    rows = math.ceil(n / cols)
    cw, ch = w / cols, h / rows
    size = min(cw, ch) * 0.74

    slots = spec.get("slots")
    if slots:
        order = [s["shape"] for s in slots]
        arts = [art_for(s["img"]) if art_for else None for s in slots]
    else:
        order = [shape] * n
        arts = [art] * n

    for i in range(n):
        cx = x0 + cw * (i % cols) + cw / 2
        cy = y0 + h - ch * (i // cols) - ch / 2
        kind = order[i]
        piece_art = arts[i]
        if piece_art is not None and piece_art.exists():
            inner = size * SHAPE_FIT.get(kind, 0.8)
            # A triangle's usable room sits low, a half circle's lower still.
            drop = {"triangle": -0.09, "halfcircle": -0.14}.get(kind, 0.0) * size
            draw_art(c, piece_art, (cx - inner / 2, cy - inner / 2 + drop, inner, inner))

        c.saveState(); _dashed(c, level)
        s = size * 0.98
        if kind == "circle":
            c.circle(cx, cy, s / 2, stroke=1, fill=0)
        elif kind == "halfcircle":
            p = c.beginPath()
            p.moveTo(cx - s / 2, cy - s / 4)
            p.arcTo(cx - s / 2, cy - s / 4 - s / 2, cx + s / 2, cy - s / 4 + s / 2, 0, 180)
            p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "triangle":
            p = c.beginPath()
            p.moveTo(cx, cy + s / 2); p.lineTo(cx + s / 2, cy - s / 2)
            p.lineTo(cx - s / 2, cy - s / 2); p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "diamond":
            p = c.beginPath()
            p.moveTo(cx, cy + s / 2); p.lineTo(cx + s / 2, cy)
            p.lineTo(cx, cy - s / 2); p.lineTo(cx - s / 2, cy); p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "rectangle":
            c.rect(cx - s / 2, cy - s * 0.35, s, s * 0.7, stroke=1, fill=0)
        else:
            c.rect(cx - s / 2, cy - s / 2, s, s, stroke=1, fill=0)
        c.restoreState()
        draw_scissors(c, cx - s / 2 - 14, cy + s / 2 - 6)


def cut_pieces(c, level, box, spec, build, art_for):
    """
    Level 5, odd page: the pieces laid out to be cut out.

    Each piece gets a dashed outline offset a little outside its drawing, so a
    child cuts around the shape rather than along the line they coloured.
    """
    x0, y0, w, h = box
    n = len(build)
    cols = 2 if n <= 4 else 3
    rows = math.ceil(n / cols)
    cw, ch = w / cols, h / rows
    cell = min(cw, ch) * 0.80

    for i, piece in enumerate(build):
        cx = x0 + cw * (i % cols) + cw / 2
        cy = y0 + h - ch * (i // cols) - ch / 2
        cell_box = (cx - cell / 2, cy - cell / 2, cell, cell)
        # The cut page shows every piece upright, however it is angled once
        # assembled, because a child cuts a shape, not an orientation.
        if not draw_piece(c, piece["img"], cell_box):
            png = art_for(piece["img"])
            if png is not None and png.exists():
                draw_art(c, png, cell_box)

        c.saveState(); _dashed(c, level)
        c.roundRect(cx - cell * 0.58, cy - cell * 0.58, cell * 1.16, cell * 1.16, 10, stroke=1, fill=0)
        c.restoreState()
        draw_scissors(c, cx - cell * 0.58 - 13, cy + cell * 0.58 - 6)


def cut_glue(c, level, box, spec, build, art_for):
    """
    Level 5, even page: the finished shape as a faint dotted outline, so the
    cut pieces have somewhere to be glued.
    """
    x0, y0, w, h = box
    side = min(w, h * 0.92)
    ax, ay = x0 + (w - side) / 2, y0 + (h - side) / 2

    # Light gray, so the child's own coloured piece covers it rather than
    # showing through around the edges.
    ghost = Color(0.72, 0.72, 0.72)
    for piece in build:
        pw = side * piece["w"]
        pbox = (ax + side * piece["x"] - pw / 2, ay + side * piece["y"] - pw / 2, pw, pw)
        if draw_piece(c, piece["img"], pbox, fill=ghost, rot=piece.get("rot", 0)):
            continue
        png = art_for(piece["img"])
        if png is not None and png.exists():
            draw_art(c, png, pbox, fill=ghost)

    c.saveState()
    c.setStrokeGray(0.55)
    c.setLineWidth(1.2)
    c.setDash(2, 4)
    c.rect(ax, ay, side, side, stroke=1, fill=0)
    c.restoreState()

    c.setFont("Fredoka-SemiBold", 11)
    c.setFillColor(black)
    c.drawCentredString(x0 + w / 2, y0 + 6, "Glue your pieces on top of the gray shapes.")


CUTTERS = {
    "snip": cut_snip,
    "straight": cut_straight,
    "corner": cut_corner,
    "zigzag": cut_zigzag,
    "wave": cut_wave,
    "curve": cut_curve,
    "scurve": cut_scurve,
    "arc": cut_arc,
    "steps": cut_steps,
    "mixed": cut_mixed,
    "path": cut_path,
}


# --- Assembly --------------------------------------------------------------


def draw_activity(c: canvas.Canvas, activity: dict, levels: dict) -> None:
    """Draw one activity onto the current page of an open canvas."""
    level = activity["level"]

    draw_tear_line(c)
    below = draw_header(c, activity["title"], level, levels[level]["name"])
    draw_footer(c, activity["page"])

    work_top = below
    work_bottom = M_BOTTOM + 22
    work_h = work_top - work_bottom

    spec = activity["cut"]
    art = ART_CLEAN / f"{activity['image']}.png" if activity.get("image") else None
    art_for = lambda key: ART_CLEAN / f"{key}.png"
    work_box = (CONTENT_L, work_bottom, CONTENT_W, work_h)

    if spec["type"] == "pieces":
        cut_pieces(c, level, work_box, spec, activity["build"], art_for)
    elif spec["type"] == "glue":
        cut_glue(c, level, work_box, spec, activity["build"], art_for)
    elif spec["type"] == "shape":
        # Level 4 puts the art inside each cutting shape rather than above it.
        cut_shape(c, level, work_box, spec, art, art_for)
    else:
        art_h = work_h * 0.52
        if art is not None and art.exists():
            draw_art(c, art, (CONTENT_L, work_top - art_h, CONTENT_W, art_h))
        for placed in activity.get("scene", []):
            png = art_for(placed["img"])
            if not png.exists():
                continue
            pw = CONTENT_W * placed["w"]
            draw_art(c, png, (
                CONTENT_L + CONTENT_W * placed["x"] - pw / 2,
                work_bottom + work_h * placed["y"] - pw / 2,
                pw, pw,
            ))
        cut_box = (CONTENT_L, work_bottom, CONTENT_W, work_h - art_h - 12)
        if activity.get("scene"):
            # A scene page keeps its own vertical placement, so the cutting
            # path gets the full height rather than only the lower half.
            cut_box = (CONTENT_L, work_bottom, CONTENT_W, work_h)
        CUTTERS.get(spec["type"], cut_straight)(c, level, cut_box, spec)

    c.showPage()
    c.save()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("activities", nargs="*", type=int)
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    register_fonts()
    data = json.loads((BOOK / "activities.json").read_text())
    levels = {l["level"]: l for l in data["levels"]}
    by_n = {a["n"]: a for a in data["activities"]}

    wanted = sorted(by_n) if args.all else args.activities
    if not wanted:
        ap.error("name at least one activity number, or pass --all")

    OUT.mkdir(parents=True, exist_ok=True)
    for n in wanted:
        a = by_n.get(n)
        if a is None:
            print(f"activity {n}: not in activities.json, skipped")
            continue
        needed = [a["image"]] if a.get("image") else []
        needed += [p["img"] for p in a.get("scene", [])]
        needed += [sl["img"] for sl in a.get("cut", {}).get("slots", [])]
        missing = [k for k in dict.fromkeys(needed) if not (ART_CLEAN / f"{k}.png").exists()]
        if missing:
            print(f"activity {n}: {', '.join(missing)} not generated yet, skipped")
            continue
        out = OUT / f"activity-{n:02d}.pdf"
        build(a, levels, out)
        print(f"activity {n:2d}  page {a['page']:2d}  level {a['level']}  → out/{out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
