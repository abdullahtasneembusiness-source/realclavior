#!/usr/bin/env python3
"""
Lay every cleaned illustration out on one sheet, for checking against the
quality checklist in one pass rather than opening 27 files.

Each cell is labelled with its key and the two numbers that predict trouble:
how much of the raw image was dropped as speckle (high means Flux textured
something it should have left open) and how much of the cell is ink (high
means the drawing is busy, low means it came out spindly).

Usage:
    python3 book/scripts/contact_sheet.py
    python3 book/scripts/contact_sheet.py --out /tmp/sheet.png --cols 6
"""

import argparse
import json
from pathlib import Path

import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_pages import art_path  # noqa: E402

HERE = Path(__file__).resolve().parent
RAW = HERE.parent / "book1" / "art"
CLEAN = HERE.parent / "book1" / "art-clean"
IMAGES = HERE.parent / "book1" / "images.json"




def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=HERE.parent / "out" / "contact-sheet.png")
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--cell", type=int, default=300)
    args = ap.parse_args()

    keys = [i["key"] for i in json.loads(IMAGES.read_text())["images"]]
    paths = [(k, art_path(k)) for k in keys]
    paths = [(k, p) for k, p in paths if p is not None]
    if not paths:
        print("No illustrations found. Generate some first.")
        return 1

    cols = args.cols
    rows = (len(paths) + cols - 1) // cols
    cell, label = args.cell, 26
    sheet = Image.new("L", (cols * cell, rows * (cell + label)), 255)
    draw = ImageDraw.Draw(sheet)

    for i, (key, path) in enumerate(paths):
        im = Image.open(path).convert("L")
        ink = float((np.asarray(im) < 128).mean() * 100)

        im.thumbnail((cell - 8, cell - 8))
        x, y = (i % cols) * cell, (i // cols) * (cell + label)
        sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        draw.text((x + 6, y + cell + 6), f"{key}  ink {ink:.0f}%", fill=0)
        draw.rectangle([x, y, x + cell - 1, y + cell + label - 1], outline=200)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"{len(paths)} images, {cols}x{rows} → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
