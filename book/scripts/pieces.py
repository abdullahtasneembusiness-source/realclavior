#!/usr/bin/env python3
"""
The cut-and-glue pieces for Level 5, and the plain objects Level 4 needs,
drawn in code.

These were meant to come from Flux, and three attempts showed why they can't.
Flux has an overwhelming prior for complete vehicles: "a single truck cab
shape on its own" returned a whole car, "a dump truck tipper bed on its own"
returned a whole dump truck. Only the wheel came back as a part, because a
wheel is also a whole thing.

The deciding reason is fit. Each image is generated independently, so a cab
and a bed would arrive at unrelated scales and would not sit together when a
child glued them down — which is the entire point of the activity. Drawn
here, every piece lives in one coordinate system, so the shape a child cuts
out is the same shape and the same size as the grey shape it glues onto.

Every piece is defined inside a unit box with the origin bottom-left, and gets
a small deterministic wobble so it sits alongside Flux's hand-drawn line work
instead of reading as clip art.
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


# --- Geometry helpers ------------------------------------------------------


def _signed_area(pts) -> float:
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]))


def offset_outline(pts, distance):
    """
    Push a closed outline outward by `distance`, in the outline's own units.

    Each vertex moves along the bisector of its two edge normals, so a long
    thin bar keeps its proportions instead of ballooning at the ends the way
    scaling about a centre would. That is what lets a cutting line follow the
    shape of the piece rather than a box around it.
    """
    pts = list(pts)
    if _signed_area(pts) < 0:  # normalise to counter-clockwise
        pts.reverse()

    n = len(pts)
    normals = []
    for i in range(n):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        dx, dy = x1 - x0, y1 - y0
        length = math.hypot(dx, dy) or 1e-9
        normals.append((dy / length, -dx / length))  # outward for CCW

    out = []
    for i in range(n):
        nx0, ny0 = normals[i - 1]
        nx1, ny1 = normals[i]
        bx, by = nx0 + nx1, ny0 + ny1
        length = math.hypot(bx, by)
        if length < 1e-6:  # a full reversal, such as the tip of a tooth
            bx, by, length = nx1, ny1, 1.0
        # For unit normals |n0+n1| is 2cos(half the turn), so this is the
        # miter length that keeps the offset parallel to both edges. Capped,
        # or a sharp corner like a bucket tooth throws out a long spike.
        factor = min(2 * distance / (length * length), 2 * distance)
        out.append((pts[i][0] + bx * factor, pts[i][1] + by * factor))
    return out


# --- Piece geometry --------------------------------------------------------
# Each returns a list of closed outlines in unit coordinates. The first is the
# piece's silhouette; the rest are details drawn inside it.


def cab():
    """A truck cab: a rounded body with one big window."""
    return [
        _rounded_rect(0.14, 0.06, 0.86, 0.84, 0.10),
        _rounded_rect(0.27, 0.42, 0.73, 0.74, 0.05),
    ]


def bed():
    """A tipper body: an open box that slopes up towards the back."""
    return [
        [(0.06, 0.16), (0.94, 0.16), (0.94, 0.60), (0.24, 0.84), (0.06, 0.84)],
        [(0.14, 0.26), (0.86, 0.26), (0.86, 0.56), (0.28, 0.74), (0.14, 0.74)],
    ]


def wheel():
    return [_circle(0.5, 0.5, 0.42), _circle(0.5, 0.5, 0.16)]


def track():
    """
    An excavator track: a long low body with rollers and tread blocks.

    The tread is what tells it apart from an arm section at a glance — both
    were rounded bars before, and a child holding two near-identical pieces
    cannot tell which goes where.
    """
    outlines = [
        _rounded_rect(0.02, 0.30, 0.98, 0.70, 0.20, steps=9),
        _circle(0.25, 0.50, 0.10),
        _circle(0.75, 0.50, 0.10),
    ]
    for i in range(7):  # tread blocks along the underside
        x = 0.12 + i * 0.115
        outlines.append([(x, 0.30), (x + 0.07, 0.30), (x + 0.07, 0.38), (x, 0.38)])
    return outlines


def exc_cab():
    return [
        _rounded_rect(0.12, 0.08, 0.88, 0.82, 0.12),
        _rounded_rect(0.24, 0.40, 0.64, 0.70, 0.05),
    ]


def arm():
    """One straight arm section: a plain bar with a pin hole at each end."""
    return [
        _rounded_rect(0.04, 0.38, 0.96, 0.62, 0.12, steps=7),
        _circle(0.15, 0.50, 0.055),
        _circle(0.85, 0.50, 0.055),
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
    """
    A tower crane: mast, jib across the top, and a hook on a short cable.

    The silhouette is one outline so the cutting line can follow it, with the
    cable and hook drawn inside rather than hanging off the edge.
    """
    mast = [
        (0.38, 0.00), (0.62, 0.00), (0.62, 0.88),
        (1.00, 0.88), (1.00, 1.00), (0.00, 1.00), (0.00, 0.88), (0.38, 0.88),
    ]
    return [
        mast,
        [(0.11, 0.74), (0.17, 0.74), (0.17, 0.88), (0.11, 0.88)],   # cable
        _circle(0.14, 0.70, 0.045),                                 # hook
        [(0.38, 0.30), (0.62, 0.30)],                               # mast brace
        [(0.38, 0.58), (0.62, 0.58)],
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


PIECES = {
    "o-crate": crate,
    "o-block": block,
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


def piece_box(box, uniform: bool):
    """
    Resolve a drawing box into (origin x, origin y, x scale, y scale).

    Pieces are square by default. A crane is not: it needs a tall narrow box,
    and forcing it square either shrinks it below the building beside it or
    pushes it out of the frame.
    """
    bx, by, bw, bh = box
    if uniform:
        side = min(bw, bh)
        return bx + (bw - side) / 2, by + (bh - side) / 2, side, side
    return bx, by, bw, bh


def draw_piece(c, key: str, box, fill=None, stroke=None, rot: float = 0.0,
               uniform: bool = True) -> bool:
    """
    Draw a named piece to fit `box`. Returns False for an unknown key.

    With `fill` set the piece is drawn as a flat silhouette, which is what the
    glue page's grey ghost needs; otherwise it is outlined like the rest of
    the book's line art.

    `rot` turns the piece about the centre of its box, in degrees. An
    excavator's boom and stick are the same bar at two different angles, so
    the alternative is drawing near-duplicate pieces a child has to tell
    apart.
    """
    make = PIECES.get(key)
    if make is None:
        return False

    ox, oy, sx, sy = piece_box(box, uniform)
    bx, by, bw, bh = box

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
        p.moveTo(ox + pts[0][0] * sx, oy + pts[0][1] * sy)
        for x, y in pts[1:]:
            p.lineTo(ox + x * sx, oy + y * sy)
        p.close()
        c.drawPath(p, stroke=1, fill=1 if fill is not None else 0)
    c.restoreState()
    return True


def draw_piece_cutline(c, key: str, box, gap: float = 0.055, uniform: bool = True) -> bool:
    """
    Draw the dashed cutting line around a piece, following its own silhouette.

    A rectangle around each piece would be easier, but then the shape a child
    cuts out is not the shape they glue down, and the build never fits
    together.
    """
    make = PIECES.get(key)
    if make is None:
        return False

    ox, oy, sx, sy = piece_box(box, uniform)
    silhouette = _wobble(make()[0], seed=hash((key, 0)) & 0xFFFF)
    line = offset_outline(silhouette, gap)

    p = c.beginPath()
    p.moveTo(ox + line[0][0] * sx, oy + line[0][1] * sy)
    for x, y in line[1:]:
        p.lineTo(ox + x * sx, oy + y * sy)
    p.close()
    c.drawPath(p, stroke=1, fill=0)
    return True
