# Cut, Color & Build — KDP activity books

Book 1 is *Cut, Color & Build: Construction Site*: a scissor-skills activity
book for ages 3–5. 8.5 × 11 inches, 76 pages, 35 activities across 5 levels.

Every activity page is one Flux illustration plus guides drawn by code. Flux
draws the trucks and scenes as line art and nothing else — no text ever comes
out of the model, because AI-generated lettering looks broken in print. Titles,
level badges, cutting lines, scissor icons, page numbers and tear-out lines are
all drawn by code.

## Layout

```
costs.jsonl                   append-only ledger at the repo root, one line
                              per billable call, each tagged with its project
book/
  scripts/
    generate-images.mjs       Replicate / FLUX 1.1 Pro image generation
  book1/
    activities.json           the 35 pages: titles, levels, cut specs, art refs
    images.json               the 30 unique illustrations and their subjects
    style.txt                 the style block prepended to every prompt
    CHECKLIST.md              what makes an image a reject
    art/                      generated PNGs, committed
```

## Generating images

The agent sandbox cannot reach `api.replicate.com` — the egress proxy denies the
CONNECT — so generation runs in GitHub Actions, where the runner has open
internet. Run the **Generate book images** workflow from the Actions tab. It
reads `REPLICATE_API_KEY` from repository secrets, generates only what is
missing, and commits the PNGs plus the cost ledger back to the branch.

Locally (or anywhere with network access):

```bash
DRY_RUN=1 node book/scripts/generate-images.mjs          # prompts + price, free
ONLY=a06,a23,a29 node book/scripts/generate-images.mjs   # the test batch, $0.12
node book/scripts/generate-images.mjs                    # everything missing
```

Whole book: 30 images, $1.20 at $0.04 each on FLUX 1.1 Pro.

## Checking a PDF before upload

```bash
python3 book/scripts/check_pdf.py book/out/interior.pdf
```

Page count, page size, whether every font is embedded, and how close the
nearest mark comes to the trim edge. KDP only reports these after a long
upload, and an unembedded font is invisible until it does — reportlab
defaults to Helvetica, one of the base-14 fonts it references without
embedding, so a single default-font operation anywhere is enough to fail.
`register_fonts()` makes Fredoka the canvas default so there is nothing
unembedded to fall back to.

## Money

This pipeline spends real money, so the rules are in the code rather than in
anyone's head:

- `DRY_RUN=1` is a complete free rehearsal — prompts, sizes and price.
- `ONLY=` restricts a run, so one image can be proved before a batch of nine.
- Anything already in `art/` is skipped; a re-run costs nothing.
- Each run is priced up front and aborts above `CEILING_USD` (default $5).
- A failure stops the run. Nothing retries on its own — an automatic retry is
  an automatic second charge.
- Every charge is appended to `costs.jsonl` before the next call starts.

## Cleaning the art

Flux draws in soft grays and, left to itself, stipples anything that should
read as sand or dirt. Neither prints well in a black-and-white interior, so
every image goes through `scripts/clean-art.py` on its way to a page:
threshold to pure black on white, drop ink blobs too small to be line work,
then grow what is left so the lines are thick enough for a 3-year-old to stay
inside. Output lands in `book1/art-clean/`.

```bash
python3 book/scripts/clean-art.py          # every image
python3 book/scripts/clean-art.py a06      # just one
```

The split matters: cleanup fixes weight and speckle, and nothing else. If Flux
returns a detailed machine instead of a toy, that is a prompt problem.

## What Flux ignores

Flux 1.1 Pro is distilled. It rejects a `negative_prompt` outright, and it
largely ignores negations inside the prompt too — the first two test images
came back stippled despite "no dots, no speckles, no stippling" sitting in the
style block, because naming a thing tends to summon it.

So the levers that actually work are positive ones: describing the line weight
as a single marker stroke, anchoring simplification to a concrete object (a
wooden toy, a preschool sticker), and saying what a surface *is* ("one smooth
rounded shape") rather than what it must not have. The remaining "no ..."
clauses in `style.txt` are kept because they cost nothing, not because they
carry the result.

## Style consistency

All 30 images share seed 42 and a byte-identical style block, which is what
keeps the drawings looking like one book. The trade-off is that re-running an
image reproduces it exactly, so a redo needs `SEED=43` or a sharper subject
line. See `book1/CHECKLIST.md`.
