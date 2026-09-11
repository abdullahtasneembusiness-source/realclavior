#!/usr/bin/env python3
"""
Draw activity pages for "Cut, Color & Build: Construction Site".

Everything on the page except the illustration is drawn here: the title, the
level badge, the cutting lines and their scissor icons, the tear-out line, the
frame and the footer. Flux never draws text, because AI lettering prints as
broken glyphs.

Illustrations reach the page as vector either way. Flux's raster output is
cleaned and traced to Bezier curves, because placing a 1408px image across a
6 inch page is only about 235dpi and prints soft. Recraft returns SVG, which
is drawn straight through.

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
from scipy import ndimage
from PIL import Image
from reportlab import rl_config
from reportlab.lib.colors import Color, black, white
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfgen.canvas import FILL_EVEN_ODD

from pieces import PIECES, draw_piece, draw_piece_cutline, piece_box

HERE = Path(__file__).resolve().parent
BOOK = HERE.parent / "book1"
ART_CLEAN = BOOK / "art-clean"
ART_RAW = BOOK / "art"

FONTS = HERE.parent / "assets" / "fonts"
OUT = HERE.parent / "out"


def art_path(key: str) -> Path | None:
    """
    Where an illustration lives, whichever model drew it.

    Every illustration is cleaned and traced, so they all come from art-clean.
    """
    candidate = ART_CLEAN / f"{key}.png"
    return candidate if candidate.exists() else None

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

# A first snip is made from the paper's edge inward, so level 1's lines run
# as low as KDP allows. The endpoint sits above 0.25in by half the line
# weight, because a round cap paints past where the line stops.
SNIP_BOTTOM = 0.31 * inch


def register_fonts() -> None:
    """
    Register Fredoka and make it the canvas default.

    reportlab's default is Helvetica, one of the base-14 fonts it references
    without embedding. KDP rejects an interior with an unembedded font, and a
    single default-font operation anywhere — a drawing, a form, a stray text
    call — is enough to put Helvetica in the file. Setting the base font means
    there is no unembedded font to fall back to.
    """
    for weight in ("Regular", "SemiBold", "Bold"):
        pdfmetrics.registerFont(TTFont(f"Fredoka-{weight}", FONTS / f"Fredoka-{weight}.ttf"))
    rl_config.canvas_basefontname = "Fredoka-Regular"


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


@lru_cache(maxsize=64)
def silhouette(png: Path, grow: int = 0):
    """
    Trace the drawing's filled body: its ink plus everything enclosed by it.

    Tracing the ink alone gives the strokes, so filling that with colour tints
    the lines rather than what they surround. The body is found by flooding
    white inward from the border — anything the flood cannot reach is inside
    the drawing.

    `grow` pushes the body outward by that many pixels, which is how a cutting
    line follows an illustration's own shape with a little clearance instead
    of slicing through the lines a child just coloured.
    """
    a = np.asarray(Image.open(png).convert("L"))
    ink = a < 128

    labels, _ = ndimage.label(~ink)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    outside = np.isin(labels, edge[edge != 0])
    body = ~outside
    if grow:
        body = ndimage.binary_dilation(body, ndimage.generate_binary_structure(2, 2),
                                       iterations=grow)

    ys, xs = np.nonzero(body)
    bbox = (
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        if xs.size
        else (0, 0, a.shape[1], a.shape[0])
    )
    return potrace.Bitmap(np.where(body, 0, 255).astype("uint8")).trace(), bbox


def draw_body(c: canvas.Canvas, png: Path, box, fill) -> None:
    """Fill the drawing's body with one flat colour, for the cover."""
    path, (ix0, iy0, ix1, iy1) = silhouette(png)
    iw, ih = ix1 - ix0, iy1 - iy0
    bx, by, bw, bh = box
    scale = min(bw / iw, bh / ih)
    ox = bx + (bw - iw * scale) / 2 - ix0 * scale
    oy = by + (bh - ih * scale) / 2 + ih * scale + iy0 * scale

    c.saveState()
    c.setFillColor(fill)
    p = c.beginPath()
    for curve in path:
        pts = [(ox + q.x * scale, oy - q.y * scale) for q in
               [curve.start_point] + [seg.end_point for seg in curve]]
        p.moveTo(*pts[0])
        for pt_ in pts[1:]:
            p.lineTo(*pt_)
        p.close()
    c.drawPath(p, stroke=0, fill=1, fillMode=FILL_EVEN_ODD)
    c.restoreState()


def draw_art(
    c: canvas.Canvas,
    png: Path,
    box: tuple[float, float, float, float],
    fill=black,
) -> None:
    """Draw an illustration to fit inside (x, y, w, h), centred."""
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


def place(c: canvas.Canvas, key: str, box, fill=black) -> bool:
    """
    Draw whatever `key` names — a code-drawn piece or a generated image.

    One entry point, so activities.json can name either without the page
    builder caring which it got.
    """
    if draw_piece(c, key, box, fill=None if fill is black else fill):
        return True
    path = art_path(key)
    if path is None:
        return False
    draw_art(c, path, box, fill=fill)
    return True


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
    # Far enough left that a cutting line's scissor mark, which sits just
    # inside the content edge, never lands on top of it.
    c.translate(TEAR_X - 15, PAGE_H / 2)
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


def draw_footer(c: canvas.Canvas, page: int, note: str = "Color first, then cut!",
                y: float | None = None) -> None:
    """
    Page number and a one-line instruction.

    `y` lifts the line above the work area, for the level 1 snips that have to
    run right down to the bottom of the page.
    """
    baseline = M_BOTTOM - 2 if y is None else y
    c.setFont("Fredoka-Regular", 9)
    c.setFillColor(black)
    c.drawString(CONTENT_L, baseline, note)
    c.drawRightString(CONTENT_R, baseline, str(page))


# --- Cutting guides --------------------------------------------------------


def _dashed(c: canvas.Canvas, level: int):
    c.setStrokeColor(black)
    c.setLineWidth(LEVEL_STROKE[level])
    c.setDash(*LEVEL_DASH[level])
    c.setLineCap(1)


def cut_snip(c, level, box, spec):
    """
    Level 1: snips rising from the bottom of the page.

    They run down to SNIP_BOTTOM rather than stopping inside the work area,
    because a first snip is made by pushing the scissors in from the paper's
    edge. That is as low as KDP allows content on a book without bleed, so the
    footer moves up out of the way instead.
    """
    x0, _, w, _ = box
    n = spec.get("count", 8)
    top = SNIP_BOTTOM + 1.6 * inch
    gap = w / n
    for i in range(n):
        x = x0 + gap * (i + 0.5)
        c.saveState(); _dashed(c, level)
        c.line(x, SNIP_BOTTOM, x, top)
        c.restoreState()
        draw_scissors(c, x - 4.5, top + 8)


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
    """
    Activity 35: one long route that revisits every path the book has taught.

    Straight, then zigzag, then wave, then curve, drawn once across the full
    width and tall enough to use the page rather than skim across it.
    """
    def fn(t):
        if t < 0.22:                       # the straight roads of level 2
            return 0.0
        if t < 0.48:                       # the zigzag of level 3
            u = ((t - 0.22) * 7) % 1.0
            return 30 * (4 * abs(u - 0.5) - 1)
        if t < 0.74:                       # the waves
            return 30 * math.sin(2 * math.pi * (t - 0.48) * 3.4)
        return 44 * math.sin(math.pi * (t - 0.74) / 0.26)   # one long curve

    _wiggle(c, level, box, spec, fn, n=1)


SHAPES = ("square", "rectangle", "triangle", "circle", "halfcircle", "diamond", "mixed")

# How much of each cutting shape the drawing inside it may fill. A triangle
# or a diamond encloses far less than its bounding square does.
SHAPE_FIT = {"square": 0.86, "rectangle": 0.84, "circle": 0.70,
             "triangle": 0.70, "diamond": 0.60, "halfcircle": 0.64}


def _shape_start(kind, cx, cy, s):
    """Where a child puts the scissors in, per shape, so the mark sits on it."""
    return {
        "circle": (cx - s / 2, cy),
        "halfcircle": (cx - s / 2, cy - s / 4),
        "triangle": (cx - s / 2, cy - s / 2),
        "diamond": (cx - s / 2, cy),
        "rectangle": (cx - s / 2, cy + s * 0.35),
    }.get(kind, (cx - s / 2, cy + s / 2))


def cut_shape(c, level, box, spec, art: str | None = None):
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
        order = [sl["shape"] for sl in slots]
        arts = [sl["img"] for sl in slots]
    else:
        order = [shape] * n
        arts = [art] * n

    for i in range(n):
        cx = x0 + cw * (i % cols) + cw / 2
        cy = y0 + h - ch * (i // cols) - ch / 2
        kind = order[i]
        if arts[i] is not None:
            inner = size * SHAPE_FIT.get(kind, 0.8)
            # A triangle's usable room sits low, a half circle's lower still.
            drop = {"triangle": -0.09, "halfcircle": -0.14}.get(kind, 0.0) * size
            place(c, arts[i], (cx - inner / 2, cy - inner / 2 + drop, inner, inner))

        c.saveState(); _dashed(c, level)
        s_ = size * 0.98
        if kind == "circle":
            c.circle(cx, cy, s_ / 2, stroke=1, fill=0)
        elif kind == "halfcircle":
            p = c.beginPath()
            p.moveTo(cx - s_ / 2, cy - s_ / 4)
            p.arcTo(cx - s_ / 2, cy - s_ / 4 - s_ / 2, cx + s_ / 2, cy - s_ / 4 + s_ / 2, 0, 180)
            p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "triangle":
            p = c.beginPath()
            p.moveTo(cx, cy + s_ / 2); p.lineTo(cx + s_ / 2, cy - s_ / 2)
            p.lineTo(cx - s_ / 2, cy - s_ / 2); p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "diamond":
            p = c.beginPath()
            p.moveTo(cx, cy + s_ / 2); p.lineTo(cx + s_ / 2, cy)
            p.lineTo(cx, cy - s_ / 2); p.lineTo(cx - s_ / 2, cy); p.close()
            c.drawPath(p, stroke=1, fill=0)
        elif kind == "rectangle":
            c.rect(cx - s_ / 2, cy - s_ * 0.35, s_, s_ * 0.7, stroke=1, fill=0)
        else:
            c.rect(cx - s_ / 2, cy - s_ / 2, s_, s_, stroke=1, fill=0)
        c.restoreState()

        sx, sy = _shape_start(kind, cx, cy, s_)
        draw_scissors(c, sx - 4, sy - 2.5)


def cut_outline(c, level, box, spec, art: str | None = None):
    """
    A dashed line that follows the illustration's own silhouette.

    A hard hat inside a half circle leaves its brim outside the cut, and a
    toolbox inside a rectangle is not a toolbox shape at all. This traces the
    drawing itself, grown a little so the line clears what a child coloured.
    """
    x0, y0, w, h = box
    n = spec.get("count", 2)
    cols = 2 if n > 1 else 1
    rows = math.ceil(n / cols)
    cw, ch = w / cols, h / rows
    size = min(cw, ch) * 0.80

    png = art_path(art) if art else None
    for i in range(n):
        cx = x0 + cw * (i % cols) + cw / 2
        cy = y0 + h - ch * (i // cols) - ch / 2
        cell = (cx - size / 2, cy - size / 2, size, size)
        if png is None:
            continue
        draw_art(c, png, cell)

        c.saveState(); _dashed(c, level)
        start = _draw_silhouette_path(c, png, cell, grow=26)
        c.restoreState()
        if start:
            draw_scissors(c, start[0] - 4, start[1] - 2.5)


def _draw_silhouette_path(c, png: Path, box, grow: int):
    """Stroke the grown silhouette of an illustration. Returns its left edge."""
    path, (ix0, iy0, ix1, iy1) = silhouette(png, grow)
    iw, ih = ix1 - ix0, iy1 - iy0
    bx, by, bw, bh = box
    scale = min(bw / iw, bh / ih)
    ox = bx + (bw - iw * scale) / 2 - ix0 * scale
    oy = by + (bh - ih * scale) / 2 + ih * scale + iy0 * scale

    p = c.beginPath()
    for curve in path:
        pts = [(ox + q.x * scale, oy - q.y * scale)
               for q in [curve.start_point] + [seg.end_point for seg in curve]]
        p.moveTo(*pts[0])
        for pt_ in pts[1:]:
            p.lineTo(*pt_)
        p.close()
    c.drawPath(p, stroke=1, fill=0)
    return ox + ix0 * scale, oy - (iy0 + ih / 2) * scale


# Space between pieces on the cut page. Each piece's cutting line stands off
# its outline, so two neighbours need room for both.
PIECE_PAD = 34.0


def pack_pieces(build, side, width):
    """Shelf-pack the pieces at true size: rows fill left to right and wrap."""
    rows, row, row_w, row_h = [], [], 0.0, 0.0
    for piece in build:
        pw = side * piece["w"]
        ph = side * piece.get("h", piece["w"])
        if row and row_w + pw + PIECE_PAD > width:
            rows.append((row, row_w, row_h))
            row, row_w, row_h = [], 0.0, 0.0
        row.append((piece, pw, ph))
        row_w += pw + PIECE_PAD
        row_h = max(row_h, ph)
    if row:
        rows.append((row, row_w, row_h))
    total_h = sum(r[2] for r in rows) + PIECE_PAD * (len(rows) - 1)
    return rows, total_h


def assembly_side(box, build) -> float:
    """
    The square the finished model is laid out in.

    Both level 5 pages measure from this one number, so a piece drawn at
    `side * w` on the cut page is the same size as its grey shape on the glue
    page. It shrinks until every piece fits on the cut page laid out side by
    side, because that page is the tighter of the two — a tall crane needs
    more room loose than it does standing against a building.
    """
    _, _, w, h = box
    side = min(w, h) * 0.70
    for _ in range(60):
        _, total_h = pack_pieces(build, side, w - 24)
        if total_h <= h - 12:
            break
        side *= 0.95
    return side


def cut_pieces(c, level, box, spec, build):
    """
    Level 5, odd page: the pieces laid out to be cut out.

    Each piece is drawn at exactly the size it takes in the finished model,
    and its cutting line follows its own silhouette. A rectangle around each
    piece would be easier to draw and useless to cut: the shape a child ends
    up holding has to be the shape that fits the grey outline overleaf.
    """
    x0, y0, w, h = box
    side = assembly_side(box, build)
    rows, total_h = pack_pieces(build, side, w - 24)

    y = y0 + h - max(0.0, (h - total_h) / 2)
    for row, row_w, row_h in rows:
        x = x0 + max(12.0, (w - row_w + PIECE_PAD) / 2)
        for piece, pw, ph in row:
            cell = (x, y - row_h / 2 - ph / 2, pw, ph)
            uniform = "h" not in piece
            # The cut page shows every piece upright, however it is angled
            # once assembled, because a child cuts a shape, not an angle.
            draw_piece(c, piece["img"], cell, uniform=uniform)

            c.saveState(); _dashed(c, level)
            draw_piece_cutline(c, piece["img"], cell, uniform=uniform)
            c.restoreState()
            draw_scissors(c, x - 11, y - row_h / 2 + ph / 2 - 4)
            x += pw + PIECE_PAD
        y -= row_h + PIECE_PAD


def cut_glue(c, level, box, spec, build):
    """
    Level 5, even page: the finished model as flat grey shapes, so every cut
    piece has somewhere to go.
    """
    x0, y0, w, h = box
    side = assembly_side(box, build)
    frame = side * 1.18
    ax = x0 + (w - frame) / 2
    ay = y0 + (h - frame) / 2 + 14
    # The assembly sits centred inside the frame, which is a little larger so
    # nothing — the crane especially — touches or crosses the dashed edge.
    sx = ax + (frame - side) / 2
    sy = ay + (frame - side) / 2

    ghost = Color(0.72, 0.72, 0.72)
    for piece in build:
        pw = side * piece["w"]
        ph = side * piece.get("h", piece["w"])
        pbox = (sx + side * piece["x"] - pw / 2, sy + side * piece["y"] - ph / 2, pw, ph)
        draw_piece(c, piece["img"], pbox, fill=ghost, rot=piece.get("rot", 0),
                   uniform="h" not in piece)

    c.saveState()
    c.setStrokeGray(0.55)
    c.setLineWidth(1.2)
    c.setDash(2, 4)
    c.rect(ax, ay, frame, frame, stroke=1, fill=0)
    c.restoreState()

    c.setFont("Fredoka-SemiBold", 11)
    c.setFillColor(black)
    c.drawCentredString(x0 + w / 2, y0 + 4, "Glue each piece onto its grey shape.")


CUTTERS = {
    "snip": cut_snip,
    "outline": cut_outline,
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

    spec = activity["cut"]

    draw_tear_line(c)
    below = draw_header(c, activity["title"], level, levels[level]["name"])

    work_top = below
    work_bottom = M_BOTTOM + 22
    if spec["type"] == "snip":
        # The snips own the bottom of the page, so the footer sits above them.
        snip_top = SNIP_BOTTOM + 1.6 * inch
        work_bottom = snip_top + 46
        draw_footer(c, activity["page"], y=snip_top + 30)
    elif spec["type"] == "glue":
        draw_footer(c, activity["page"], note="Glue your pieces on!")
    else:
        draw_footer(c, activity["page"])

    work_h = work_top - work_bottom
    work_box = (CONTENT_L, work_bottom, CONTENT_W, work_h)

    if spec["type"] == "pieces":
        cut_pieces(c, level, work_box, spec, activity["build"])
    elif spec["type"] == "glue":
        cut_glue(c, level, work_box, spec, activity["build"])
    elif spec["type"] == "shape":
        # Level 4 puts the art inside each cutting shape rather than above it.
        cut_shape(c, level, work_box, spec, activity.get("image"))
    elif spec["type"] == "outline":
        cut_outline(c, level, work_box, spec, activity.get("image"))
    else:
        art_h = work_h * (0.86 if spec["type"] == "snip" else 0.52)
        if activity.get("image"):
            place(c, activity["image"], (CONTENT_L, work_top - art_h, CONTENT_W, art_h))
        for placed in activity.get("scene", []):
            pw = CONTENT_W * placed["w"]
            place(c, placed["img"], (
                CONTENT_L + CONTENT_W * placed["x"] - pw / 2,
                work_bottom + work_h * placed["y"] - pw / 2,
                pw, pw,
            ))
        cut_box = (CONTENT_L, work_bottom, CONTENT_W, work_h - art_h - 12)
        if spec["type"] == "snip":
            cut_box = work_box  # cut_snip measures from the page, not the box
        if activity.get("scene"):
            # A scene page keeps its own vertical placement, so the cutting
            # path gets the full height rather than only the lower half.
            cut_box = (CONTENT_L, work_bottom, CONTENT_W, work_h)
        CUTTERS.get(spec["type"], cut_straight)(c, level, cut_box, spec)


def build(activity: dict, levels: dict, out: Path) -> None:
    """Write one activity to its own single-page PDF, for proofing."""
    c = canvas.Canvas(str(out), pagesize=(PAGE_W, PAGE_H))
    c.setTitle(activity["title"])
    draw_activity(c, activity, levels)
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
        from pieces import PIECES
        missing = [k for k in dict.fromkeys(needed)
                   if k not in PIECES and art_path(k) is None]
        if missing:
            print(f"activity {n}: {', '.join(missing)} not generated yet, skipped")
            continue
        out = OUT / f"activity-{n:02d}.pdf"
        build(a, levels, out)
        print(f"activity {n:2d}  page {a['page']:2d}  level {a['level']}  → out/{out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
