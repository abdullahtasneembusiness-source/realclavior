#!/usr/bin/env python3
"""
The cut-and-glue pieces for Level 5, drawn in code.

These were meant to come from Flux, and three attempts showed why they can't.
Flux has an overwhelming prior for complete vehicles: "a single truck cab
shape on its own" returned a whole car, "a dump truck tipper bed on its own"
returned a whole dump truck. Only the wheel came back as a part, because a
wheel is also a whole thing.

The deeper problem is fit. Each image is generated independently, so a cab and
a bed would arrive at unrelated scales and proportions and would not sit
together when a child glued them down — which is the entire point of the
activity. Drawn here, the pieces are defined in one coordinate system and the
glue page places them from the same numbers, so they always assemble.

Every piece is drawn inside a unit box with the origin bottom-left, and gets a
small deterministic wobble so it sits alongside Flux's hand-drawn line work
instead of looking like clip art.
"""

import math
import random

STROKE = 5.0  # points, matching the weight cleanup gives the Flux art


def _wobble(points, seed, amp=0.010):
    """
    Bend an outline slightly off true, the same way every run.

    The offset varies slowly along the outline rather than jumping per point:
    independent jitter on a 40-point circle reads as a polygon, while a couple
    of low-frequency waves read as a hand that wasn't quite steady.
    """
    rng = random.Random(seed)
    fx, fy = rng.uniform(1.5, 3.0), rng.uniform(1.5, 3.0)
    px, py = rng.uniform(0, math.tau), rng.uniform(0, math.tau)
    n = max(len(points), 2)
    out = []
    for i, (x, y) in enumerate(points):
        t = math.tau * i / n
        out.append((x + amp * math.sin(fx * t + px), y + amp * math.sin(fy * t + py)))
    return out


def _rounded_rect(x0, y0, x1, y1, r, steps=5):
    """Corner-rounded rectangle as a point list, counter-clockwise."""
    pts = []
    corners = [
        (x1 - r, y0 + r, -90, 0),
        (x1 - r, y1 - r, 0, 90),
        (x0 + r, y1 - r, 90, 180),
        (x0 + r, y0 + r, 180, 270),
    ]
    for cx, cy, a0, a1 in corners:
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def _circle(cx, cy, r, steps=40):
    return [
        (cx + r * math.cos(2 * math.pi * i / steps), cy + r * math.sin(2 * math.pi * i / steps))
        for i in range(steps)
    ]


# --- Piece geometry --------------------------------------------------------
# Each returns a list of closed outlines, in unit coordinates.


def cab():
    """A truck cab: a rounded body with one big window."""
    return [
        _rounded_rect(0.14, 0.06, 0.86, 0.84, 0.10),
        _rounded_rect(0.27, 0.42, 0.73, 0.74, 0.05),
    ]


def bed():
    """A tipper body: an open box that slopes up towards the back."""
    outer = [(0.06, 0.16), (0.94, 0.16), (0.94, 0.60), (0.24, 0.84), (0.06, 0.84)]
    inner = [(0.14, 0.26), (0.86, 0.26), (0.86, 0.56), (0.28, 0.74), (0.14, 0.74)]
    return [outer, inner]


def wheel():
    return [_circle(0.5, 0.5, 0.42), _circle(0.5, 0.5, 0.16)]


def track():
    """An excavator track: a long low stadium with a roller at each end."""
    return [
        _rounded_rect(0.02, 0.34, 0.98, 0.66, 0.16, steps=9),
        _circle(0.26, 0.50, 0.09),
        _circle(0.74, 0.50, 0.09),
    ]


def exc_cab():
    return [
        _rounded_rect(0.12, 0.08, 0.88, 0.82, 0.12),
        _rounded_rect(0.24, 0.40, 0.64, 0.70, 0.05),
    ]


def arm():
    """One straight arm section, with a pin hole at each end."""
    return [
        _rounded_rect(0.04, 0.36, 0.96, 0.64, 0.14, steps=7),
        _circle(0.16, 0.50, 0.06),
        _circle(0.84, 0.50, 0.06),
    ]


def bucket():
    """
    A scoop with three teeth cut into its own edge.

    The teeth are part of the single outline rather than separate shapes: as
    separate shapes they arrive as loose rectangles floating below the scoop,
    and a child cutting them out would get four pieces instead of one.
    """
    outline = [(0.10, 0.88), (0.90, 0.88), (0.80, 0.30)]
    for x in (0.66, 0.50, 0.34):  # right to left, following the outline round
        outline += [(x + 0.07, 0.30), (x, 0.08), (x - 0.07, 0.30)]
    outline.append((0.20, 0.30))
    return [outline]


def floor():
    """One storey: a wide rectangle with two windows."""
    return [
        _rounded_rect(0.04, 0.24, 0.96, 0.76, 0.04),
        _rounded_rect(0.20, 0.38, 0.44, 0.64, 0.03),
        _rounded_rect(0.56, 0.38, 0.80, 0.64, 0.03),
    ]


def roof():
    return [[(0.04, 0.26), (0.96, 0.26), (0.50, 0.80)]]


def crane():
    """A tower crane: mast, jib across the top, and a hook on a short cable."""
    return [
        _rounded_rect(0.40, 0.04, 0.60, 0.80, 0.03),   # mast
        _rounded_rect(0.06, 0.80, 0.94, 0.94, 0.04),   # jib
        _rounded_rect(0.20, 0.60, 0.26, 0.80, 0.02),   # cable
        _circle(0.23, 0.55, 0.055),                     # hook
    ]


def crate():
    """A shipping crate: a square with two boards across it."""
    return [
        _rounded_rect(0.08, 0.08, 0.92, 0.92, 0.05),
        [(0.08, 0.36), (0.92, 0.36)],
        [(0.08, 0.64), (0.92, 0.64)],
    ]


def block():
    """A cinder block: a wide rectangle with two square holes."""
    return [
        _rounded_rect(0.04, 0.26, 0.96, 0.74, 0.04),
        _rounded_rect(0.18, 0.38, 0.44, 0.62, 0.02),
        _rounded_rect(0.56, 0.38, 0.82, 0.62, 0.02),
    ]


def plank():
    """A single board, long and plain."""
    return [_rounded_rect(0.03, 0.38, 0.97, 0.62, 0.05)]


PIECES = {
    "o-crate": crate,
    "o-block": block,
    "o-plank": plank,
    "p29cab": cab,
    "p29bed": bed,
    "p29wheel": wheel,
    "p31track": track,
    "p31cab": exc_cab,
    "p31arm": arm,
    "p31bucket": bucket,
    "p33floor": floor,
    "p33roof": roof,
    "p33crane": crane,
}


def draw_piece(c, key: str, box, fill=None, stroke=None, rot: float = 0.0) -> bool:
    """
    Draw a named piece to fit (x, y, w, h). Returns False for an unknown key.

    With `fill` set the piece is drawn as a flat silhouette, which is what the
    glue page's gray ghost needs; otherwise it is outlined like the rest of
    the book's line art.

    `rot` turns the piece about the centre of its box, in degrees. An
    excavator's boom and stick are the same bar at two different angles, so
    the alternative is drawing near-duplicate pieces that a child then has to
    tell apart.
    """
    make = PIECES.get(key)
    if make is None:
        return False

    bx, by, bw, bh = box
    side = min(bw, bh)
    ox, oy = bx + (bw - side) / 2, by + (bh - side) / 2

    c.saveState()
    if rot:
        c.translate(bx + bw / 2, by + bh / 2)
        c.rotate(rot)
        c.translate(-(bx + bw / 2), -(by + bh / 2))
    if fill is not None:
        c.setFillColor(fill)
        c.setStrokeColor(fill)
    else:
        c.setStrokeColor(stroke or (0, 0, 0))
        c.setLineWidth(STROKE)
        c.setLineJoin(1)
        c.setLineCap(1)
        c.setDash()

    for i, outline in enumerate(make()):
        pts = _wobble(outline, seed=hash((key, i)) & 0xFFFF)
        p = c.beginPath()
        p.moveTo(ox + pts[0][0] * side, oy + pts[0][1] * side)
        for x, y in pts[1:]:
            p.lineTo(ox + x * side, oy + y * side)
        p.close()
        if fill is not None:
            c.drawPath(p, stroke=1, fill=1)
        else:
            c.drawPath(p, stroke=1, fill=0)
    c.restoreState()
    return True
