#!/usr/bin/env python3
"""
Turn a raw Flux illustration into print-ready line art.

Flux draws in soft grays with antialiased edges and, left to itself, sprinkles
stipple across anything that should read as sand or dirt. Neither survives a
black-and-white KDP interior well: the grays band, and the speckles print as
dirt. This does three things, in order:

  1. Threshold to pure black on white. Measured on the first test image, only
     about 2% of pixels sit in the mid-tones, so this loses edge smoothing and
     nothing else.
  2. Drop ink blobs below a minimum area. Stipple dots are small and isolated;
     real line work is long and connected.
  3. Grow what is left, so a toddler has a line thick enough to stay inside.

What it cannot do is simplify a drawing. If Flux returns a detailed machine,
the fix is the prompt, not this file.

Usage:
    python3 book/scripts/clean-art.py                 # every image in art/
    python3 book/scripts/clean-art.py a06 a23         # only these
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ART = HERE.parent / "book1" / "art"
OUT = HERE.parent / "book1" / "art-clean"

# Anything darker than this counts as ink.
INK_THRESHOLD = 128
# Ink blobs smaller than this many pixels are speckle. Sized from the test
# image, where stipple dots ran well under 100px and the smallest real detail
# (a wheel hub) was several thousand.
MIN_BLOB_AREA = 400
# Radius in pixels to grow every remaining line by, at the 1408px generation
# width. Takes a ~6px stroke to ~12px, about 1.5mm once placed on the page.
GROW_RADIUS = 3


def disc(r: int) -> np.ndarray:
    """A round structuring element, so corners grow as evenly as edges."""
    y, x = np.ogrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


def clean(path: Path) -> dict:
    gray = np.asarray(Image.open(path).convert("L"))
    ink = gray < INK_THRESHOLD
    raw_px = int(ink.sum())

    labels, count = ndimage.label(ink)
    if count:
        areas = np.bincount(labels.ravel())
        areas[0] = 0  # background
        keep = areas >= MIN_BLOB_AREA
        ink = keep[labels]
    kept_px = int(ink.sum())

    ink = ndimage.binary_dilation(ink, structure=disc(GROW_RADIUS))

    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.where(ink, 0, 255).astype("uint8")).save(OUT / path.name)

    return {
        "blobs": int(count),
        "speckle_pct": 0.0 if not raw_px else 100 * (raw_px - kept_px) / raw_px,
        "ink_pct": 100 * int(ink.sum()) / ink.size,
    }


def main() -> int:
    wanted = sys.argv[1:]
    paths = sorted(p for p in ART.glob("*.png") if not wanted or p.stem in wanted)
    if not paths:
        print(f"No images to clean in {ART}.")
        return 1

    for path in paths:
        s = clean(path)
        print(
            f"{path.stem}  {s['blobs']:5d} blobs  "
            f"{s['speckle_pct']:5.1f}% dropped as speckle  "
            f"{s['ink_pct']:5.1f}% ink  → art-clean/{path.name}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
