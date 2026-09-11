#!/usr/bin/env python3
"""
Build the KDP paperback cover: back, spine and front in one landscape page.

    +-----------------+-------+-----------------+
    |   back cover    | spine |   front cover   |
    +-----------------+-------+-----------------+

The front is a generated illustration with the title set over it; the back is
a flat sky panel carrying real interior pages as thumbnails, so a buyer can
see what they are getting.

Two constraints drive the design. Everything must survive being shrunk to a
160px-wide thumbnail on a search results page, which is why the title and the
age badge are far larger than they look at full size. And KDP rejects a cover
with text inside 0.25 inches of the trim, so every word sits inside a safe box
that this file measures rather than eyeballs.

Usage:
    python3 book/scripts/build_cover.py
    python3 book/scripts/build_cover.py --pages 76 --two-line-title
"""

import argparse
import math
import sys
from pathlib import Path

from reportlab.lib.colors import Color, white
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_pages import register_fonts  # noqa: E402

HERE = Path(__file__).resolve().parent
BOOK = HERE.parent / "book1"
ART = BOOK / "art"
OUT = BOOK.parent / "out"

# --- Geometry --------------------------------------------------------------
TRIM_W, TRIM_H = 8.5 * inch, 11 * inch
BLEED = 0.125 * inch
# KDP: a black-and-white interior on white paper is 0.002252 inches per page.
SPINE_PER_PAGE = 0.002252 * inch
# KDP rejects text closer than this to the trim edge.
SAFE = 0.25 * inch

# --- Palette ---------------------------------------------------------------
SKY = Color(0.639, 0.871, 0.953)       # sampled from the illustration's sky
NAVY = Color(0.078, 0.145, 0.278)
YELLOW = Color(1.000, 0.804, 0.106)
RED = Color(0.906, 0.243, 0.220)
SHADOW = Color(0, 0, 0, alpha=0.28)


def fit_font(c, text, font, size, max_width, floor=8):
    """Largest size at or below `size` that keeps `text` inside `max_width`."""
    while size > floor and c.stringWidth(text, font, size) > max_width:
        size -= 0.5
    return size


# Every piece of text records where it landed, so the safe-area check at the
# end measures the real layout instead of trusting that the numbers above were
# right. KDP rejects a cover with text inside 0.25in of the trim.
TEXT_BOXES: list[tuple[float, float, float, float, str]] = []


def _record(c, left, y, text, font, size):
    w = c.stringWidth(text, font, size)
    TEXT_BOXES.append((left, y - size * 0.26, left + w, y + size * 0.76, text))


def _place_x(c, x, text, font, size, align):
    """Left edge of `text` for the given alignment."""
    w = c.stringWidth(text, font, size)
    return {"center": x - w / 2, "right": x - w, "left": x}[align]


def _draw(c, x, y, text, font, size, mode):
    """One pass of text at a given render mode (0 fill, 1 stroke)."""
    t = c.beginText()
    t.setTextRenderMode(mode)
    t.setFont(font, size)
    t.setTextOrigin(x, y)
    t.textOut(text)
    c.drawText(t)


def outlined(c, x, y, text, font, size, *, fill=white, outline=NAVY,
             weight=0.045, shadow=True, align="center"):
    """
    Text in a heavy outline with a drop shadow, the way a children's cover
    needs it to read against a busy illustration.

    The outline is stroked underneath and the letter filled on top, rather
    than both in one pass: a centred stroke eats half its width out of the
    letterform, which at this weight closes the counters and turns the title
    to mush.
    """
    left = _place_x(c, x, text, font, size, align)
    _record(c, left, y, text, font, size)

    c.saveState()
    if shadow:
        c.setFillColor(SHADOW)
        _draw(c, left + size * 0.045, y - size * 0.055, text, font, size, 0)

    c.setStrokeColor(outline)
    c.setLineWidth(size * weight * 2)   # half of it falls inside the glyph
    c.setLineJoin(1)
    _draw(c, left, y, text, font, size, 1)

    c.setFillColor(fill)
    _draw(c, left, y, text, font, size, 0)
    c.restoreState()


def starburst(c, cx, cy, r_out, r_in, points=16):
    p = c.beginPath()
    for i in range(points * 2):
        r = r_out if i % 2 == 0 else r_in
        a = math.pi * i / points - math.pi / 2
        fn = p.moveTo if i == 0 else p.lineTo
        fn(cx + r * math.cos(a), cy + r * math.sin(a))
    p.close()
    return p


def ribbon(c, cx, cy, w, h):
    """A banner with notched ends and folded tails behind it."""
    half, hh = w / 2, h / 2
    notch = h * 0.42

    c.saveState()
    c.setFillColor(NAVY)
    for side in (-1, 1):
        t = c.beginPath()
        t.moveTo(cx + side * (half - 6), cy + hh - 4)
        t.lineTo(cx + side * (half + 26), cy + hh - 14)
        t.lineTo(cx + side * (half + 26), cy - hh - 2)
        t.lineTo(cx + side * (half - 6), cy - hh + 8)
        t.close()
        c.drawPath(t, stroke=0, fill=1)
    c.restoreState()

    p = c.beginPath()
    p.moveTo(cx - half, cy + hh)
    p.lineTo(cx + half, cy + hh)
    p.lineTo(cx + half - notch, cy)
    p.lineTo(cx + half, cy - hh)
    p.lineTo(cx - half, cy - hh)
    p.lineTo(cx - half + notch, cy)
    p.close()
    return p


def scissors(c, x, y, size=16, colour=NAVY):
    """The same mark the interior uses, so the cover promises what's inside."""
    s = size / 13.0
    c.saveState()
    c.setStrokeColor(colour)
    c.setLineWidth(2.0 * s)
    c.setLineCap(1)
    c.setDash()
    c.line(x, y, x + 9 * s, y + 5 * s)
    c.line(x, y + 5 * s, x + 9 * s, y)
    c.circle(x - 1.6 * s, y - 1.2 * s, 2.1 * s, stroke=1, fill=0)
    c.circle(x - 1.6 * s, y + 6.2 * s, 2.1 * s, stroke=1, fill=0)
    c.restoreState()


def cover_fill(c, image: Path, box):
    """Draw an image to cover `box` entirely, cropping the overflow."""
    bx, by, bw, bh = box
    reader = ImageReader(str(image))
    iw, ih = reader.getSize()
    scale = max(bw / iw, bh / ih)
    w, h = iw * scale, ih * scale

    c.saveState()
    p = c.beginPath()
    p.rect(bx, by, bw, bh)
    c.clipPath(p, stroke=0, fill=0)
    c.drawImage(reader, bx + (bw - w) / 2, by + (bh - h) / 2, w, h, mask=None)
    c.restoreState()
    return 72 / scale                # effective DPI once placed


def tilted_page(c, image: Path, cx, cy, width, angle):
    """An interior page as a tilted thumbnail with a white border and shadow."""
    reader = ImageReader(str(image))
    iw, ih = reader.getSize()
    height = width * ih / iw
    pad = width * 0.045

    c.saveState()
    c.translate(cx, cy)
    c.rotate(angle)
    c.setFillColor(SHADOW)
    c.roundRect(-width / 2 - pad + 4, -height / 2 - pad - 5,
                width + pad * 2, height + pad * 2, 5, stroke=0, fill=1)
    c.setFillColor(white)
    c.roundRect(-width / 2 - pad, -height / 2 - pad,
                width + pad * 2, height + pad * 2, 5, stroke=0, fill=1)
    c.drawImage(reader, -width / 2, -height / 2, width, height, mask=None)
    c.restoreState()


# --- Panels ----------------------------------------------------------------


def draw_front(c, x0, art: Path, two_line: bool) -> float:
    """x0 is the front panel's trim edge. Returns the art's effective DPI."""
    # The illustration runs to the outer bleed on three sides.
    dpi = cover_fill(c, art, (x0, 0, TRIM_W + BLEED, TRIM_H + 2 * BLEED))

    left, right = x0 + SAFE, x0 + TRIM_W - SAFE
    mid = (left + right) / 2
    usable = right - left

    # Cut-out coupon line, just inside the safe box.
    c.saveState()
    c.setStrokeColor(NAVY)
    c.setLineWidth(2.2)
    c.setDash(9, 7)
    c.roundRect(left + 6, BLEED + SAFE + 6,
                usable - 12, TRIM_H - 2 * SAFE - 12, 14, stroke=1, fill=0)
    c.restoreState()
    scissors(c, left + 6, BLEED + TRIM_H - SAFE - 18, 17)

    top = BLEED + TRIM_H

    # Small banner above the title.
    banner = "CUT, COLOR & BUILD"
    size = fit_font(c, banner, "Fredoka-Bold", 27, usable * 0.72)
    bw = c.stringWidth(banner, "Fredoka-Bold", size) + 34
    c.saveState()
    c.setFillColor(RED)
    c.roundRect(mid - bw / 2, top - 0.92 * inch, bw, size + 13, (size + 13) / 2,
                stroke=0, fill=1)
    c.restoreState()
    outlined(c, mid, top - 0.92 * inch + 9, banner, "Fredoka-Bold", size,
             weight=0.055, shadow=False)

    # The title, as large as the panel allows.
    if two_line:
        for i, line in enumerate(("CONSTRUCTION", "SITE")):
            s = fit_font(c, line, "Fredoka-Bold", 96, usable - 48)
            outlined(c, mid, top - (1.62 + i * 0.86) * inch, line, "Fredoka-Bold", s)
        ribbon_y = top - 3.28 * inch
    else:
        s = fit_font(c, "CONSTRUCTION SITE", "Fredoka-Bold", 96, usable - 48)
        outlined(c, mid, top - 1.75 * inch, "CONSTRUCTION SITE", "Fredoka-Bold", s)
        ribbon_y = top - 2.42 * inch

    # Ribbon under the title.
    label = "SCISSOR SKILLS ACTIVITY BOOK"
    rs = fit_font(c, label, "Fredoka-SemiBold", 21, usable * 0.62)
    rw = c.stringWidth(label, "Fredoka-SemiBold", rs) + 46
    c.saveState()
    c.setFillColor(RED)
    c.drawPath(ribbon(c, mid, ribbon_y, rw, rs + 17), stroke=0, fill=1)
    c.restoreState()
    outlined(c, mid, ribbon_y - rs * 0.34, label, "Fredoka-SemiBold", rs,
             weight=0.05, shadow=False)

    # Age badge, sized so it survives the thumbnail rather than to look neat.
    bx, by, br = right - 1.20 * inch, BLEED + 1.62 * inch, 1.00 * inch
    c.saveState()
    c.setFillColor(SHADOW)
    c.circle(bx + 4, by - 5, br, stroke=0, fill=1)
    c.setFillColor(YELLOW)
    c.setStrokeColor(NAVY)
    c.setLineWidth(5)
    c.circle(bx, by, br, stroke=1, fill=1)
    c.restoreState()
    outlined(c, bx, by + 0.12 * inch, "AGES", "Fredoka-Bold", 31,
             fill=NAVY, outline=NAVY, weight=0.02, shadow=False)
    outlined(c, bx, by - 0.36 * inch, "3-5", "Fredoka-Bold", 47,
             fill=NAVY, outline=NAVY, weight=0.02, shadow=False)

    # Starburst, opposite corner.
    sx, sy = left + 1.20 * inch, BLEED + 1.62 * inch
    c.saveState()
    c.setFillColor(SHADOW)
    c.drawPath(starburst(c, sx + 4, sy - 5, 1.08 * inch, 0.82 * inch), stroke=0, fill=1)
    c.setFillColor(YELLOW)
    c.setStrokeColor(NAVY)
    c.setLineWidth(4.5)
    c.drawPath(starburst(c, sx, sy, 1.08 * inch, 0.82 * inch), stroke=1, fill=1)
    c.restoreState()
    for i, line in enumerate(("35", "CUTTING", "ACTIVITIES")):
        fs = (50, 21, 18)[i]
        outlined(c, sx, sy + (0.16, -0.17, -0.41)[i] * inch, line, "Fredoka-Bold", fs,
                 fill=NAVY, outline=NAVY, weight=0.015, shadow=False)

    outlined(c, mid, BLEED + SAFE + 20, "Little Snippers Press",
             "Fredoka-SemiBold", 17, weight=0.06)
    return dpi


def draw_back(c, x0, thumbs, blurb):
    c.saveState()
    c.setFillColor(SKY)
    c.rect(0, 0, x0 + TRIM_W, TRIM_H + 2 * BLEED, stroke=0, fill=1)
    c.restoreState()

    left, right = x0 + SAFE, x0 + TRIM_W - SAFE
    mid = (left + right) / 2
    top = BLEED + TRIM_H

    outlined(c, mid, top - 1.12 * inch, "Snip, cut and build!", "Fredoka-Bold",
             fit_font(c, "Snip, cut and build!", "Fredoka-Bold", 40, right - left),
             fill=NAVY, outline=NAVY, weight=0.012, shadow=False)

    c.setFillColor(NAVY)
    c.setFont("Fredoka-Regular", 14)
    for i, line in enumerate([
        "35 activities that grow your child's scissor skills",
        "step by step, from first snips to building their own",
        "dump truck, excavator and building.",
    ]):
        y = top - (1.62 + i * 0.26) * inch
        _record(c, _place_x(c, mid, line, "Fredoka-Regular", 14, "center"),
                y, line, "Fredoka-Regular", 14)
        c.drawCentredString(mid, y, line)

    for (path, angle, dx, dy, w) in thumbs:
        tilted_page(c, path, mid + dx * inch, BLEED + dy * inch, w * inch, angle)

    # KDP prints the barcode here, so it has to be clear.
    bw_, bh_ = 2 * inch, 1.2 * inch
    c.setFillColor(white)
    c.rect(x0 + TRIM_W - SAFE - bw_, BLEED + SAFE, bw_, bh_, stroke=0, fill=1)


def build(out: Path, pages: int, two_line: bool, thumbs, art: Path):
    spine = pages * SPINE_PER_PAGE
    total_w = TRIM_W * 2 + spine + BLEED * 2
    total_h = TRIM_H + BLEED * 2

    register_fonts()
    c = canvas.Canvas(str(out), pagesize=(total_w, total_h))
    c.setTitle("Cut, Color & Build: Construction Site — cover")
    c.setAuthor("Little Snippers Press")

    back_x = BLEED
    front_x = BLEED + TRIM_W + spine

    # Sky first, across everything, so the spine is never a bare strip.
    c.setFillColor(SKY)
    c.rect(0, 0, total_w, total_h, stroke=0, fill=1)

    draw_back(c, back_x, thumbs, None)
    dpi = draw_front(c, front_x, art, two_line)

    c.showPage()
    c.save()

    panels = [(BLEED, BLEED + TRIM_W), (front_x, front_x + TRIM_W)]
    strays = []
    for x0, y0, x1, y1, text in TEXT_BOXES:
        panel = next((p for p in panels if p[0] - 1 <= x0 and x1 <= p[1] + 1), None)
        if panel is None:
            strays.append((text, "crosses a panel edge"))
            continue
        margins = (x0 - (panel[0] + SAFE), (panel[1] - SAFE) - x1,
                   y0 - (BLEED + SAFE), (BLEED + TRIM_H - SAFE) - y1)
        if min(margins) < -0.5:
            strays.append((text, f"{min(margins) / inch:+.3f} in past the safe edge"))

    return spine, total_w, total_h, dpi, strays


def render_thumbs(interior: Path, pages, scale=2.0):
    """Rasterise a few interior pages to sit on the back cover."""
    import pypdfium2 as pdfium

    OUT.mkdir(parents=True, exist_ok=True)
    doc = pdfium.PdfDocument(str(interior))
    out = []
    for page in pages:
        path = OUT / f"thumb-{page}.png"
        doc[page - 1].render(scale=scale).to_pil().save(path)
        out.append(path)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pages", type=int, default=76)
    ap.add_argument("--art", type=Path, default=None,
                    help="cover illustration; defaults to the upscaled one")
    ap.add_argument("--interior", type=Path, default=OUT / "interior.pdf")
    ap.add_argument("--out", type=Path, default=OUT / "cover.pdf")
    ap.add_argument("--two-line-title", action="store_true",
                    help="set CONSTRUCTION / SITE on two lines, which reads "
                         "better at thumbnail size")
    args = ap.parse_args()

    art = args.art or (ART / "cover-hi.png" if (ART / "cover-hi.png").exists()
                       else ART / "cover.png")
    if not art.exists():
        print(f"No cover illustration at {art}.")
        return 1

    # A snip page, a shape page and a build page, so the back shows the range.
    thumb_paths = render_thumbs(args.interior, [5, 45, 61])
    # Fanned, overlapping, with the middle one lowest and largest so the eye
    # lands on it first.
    thumbs = [
        (thumb_paths[0], 7.5, -1.58, 4.95, 2.45),
        (thumb_paths[1], -4.0, 0.00, 4.55, 2.65),
        (thumb_paths[2], 6.5, 1.58, 4.95, 2.45),
    ]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    spine, w, h, dpi, strays = build(args.out, args.pages, args.two_line_title,
                                     thumbs, art)

    print(f"cover → {args.out}")
    print(f"  art        {art.name}")
    print(f"  pages      {args.pages}, spine {spine / inch:.3f} in (no spine text)")
    print(f"  wrap       {w / inch:.3f} x {h / inch:.3f} in, {BLEED / inch} in bleed")
    print(f"  front art  {dpi:.0f} DPI across the panel")
    if dpi < 300:
        print("  WARNING: below 300 DPI. Upscale the illustration further.")

    if strays:
        print(f"  {len(strays)} text item(s) outside the safe area:")
        for text, why in strays:
            print(f"    {text!r}: {why}")
        return 1
    print(f"  safe area  all {len(TEXT_BOXES)} text items at least "
          f"{SAFE / inch} in inside the trim")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
