#!/usr/bin/env python3
"""
Check a PDF against what KDP will reject it for.

Page count and size, whether every font is embedded, and whether any ink
strays outside the safe margin. Run it before every upload — KDP's own
checker only complains after a long upload, and an unembedded font is
invisible until then.

Usage:
    python3 book/scripts/check_pdf.py book/out/interior.pdf
    python3 book/scripts/check_pdf.py book/out/cover.pdf --size 17.421 11.25 --bleeds
"""

import argparse
import sys
from pathlib import Path

import pypdfium2 as pdfium
from pypdf import PdfReader

# KDP's minimum for a paperback interior printed without bleed.
MARGIN_IN = 0.25
TRIM = (8.5, 11.0)


def fonts(reader: PdfReader):
    """Every font the file references, with whether its programme is embedded."""
    found = {}
    for page in reader.pages:
        res = page.get("/Resources")
        if res is None:
            continue
        for font in (res.get_object().get("/Font") or {}).values():
            f = font.get_object()
            name = str(f.get("/BaseFont", "?")).lstrip("/")
            desc = f.get("/FontDescriptor")
            if desc is None and f.get("/DescendantFonts"):
                desc = f["/DescendantFonts"].get_object()[0].get_object().get("/FontDescriptor")
            embedded = bool(desc) and any(
                k in desc.get_object() for k in ("/FontFile", "/FontFile2", "/FontFile3")
            )
            found[name] = found.get(name, True) and embedded
    return found


def ink_bounds(path: Path, dpi: int = 72):
    """The tightest box containing any mark, per page, in inches."""
    import numpy as np

    doc = pdfium.PdfDocument(str(path))
    worst = None
    for i, page in enumerate(doc):
        a = np.asarray(page.render(scale=dpi / 72).to_pil().convert("L"))
        ys, xs = np.nonzero(a < 250)
        if not xs.size:
            continue
        h, w = a.shape
        edges = (xs.min() / dpi, ys.min() / dpi,
                 (w - 1 - xs.max()) / dpi, (h - 1 - ys.max()) / dpi)
        closest = min(edges)
        if worst is None or closest < worst[1]:
            worst = (i + 1, closest)
    return worst


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("pdf", nargs="?", type=Path, default=Path("book/out/interior.pdf"))
    ap.add_argument("--size", nargs=2, type=float, metavar=("W", "H"), default=TRIM,
                    help="expected page size in inches; a cover is not 8.5 x 11")
    ap.add_argument("--bleeds", action="store_true",
                    help="artwork is meant to run off the edge, so skip the "
                         "margin check — a cover's safe area is checked by "
                         "build_cover.py, which knows where the text is")
    args = ap.parse_args()

    path, expect = args.pdf, tuple(args.size)
    reader = PdfReader(str(path))
    ok = True

    print(f"{path}")
    print(f"  pages           {len(reader.pages)}")

    sizes = {(round(float(p.mediabox.width) / 72, 3), round(float(p.mediabox.height) / 72, 3))
             for p in reader.pages}
    print(f"  page size       {', '.join(f'{w} x {h} in' for w, h in sorted(sizes))}")
    if sizes != {expect}:
        print(f"    FAIL: every page must be {expect[0]} x {expect[1]} in")
        ok = False

    found = fonts(reader)
    for name, embedded in sorted(found.items()):
        print(f"  font            {name}  {'embedded' if embedded else 'NOT EMBEDDED'}")
        if not embedded:
            ok = False

    if args.bleeds:
        print("  margins         skipped: this artwork bleeds off the edge by design")
    else:
        page, closest = ink_bounds(path)
        print(f"  closest ink     {closest:.3f} in from the trim edge (page {page})")
        if closest < MARGIN_IN - 0.005:
            print(f"    FAIL: KDP wants at least {MARGIN_IN} in on a book without bleed")
            ok = False

    print("  PASS" if ok else "  FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
