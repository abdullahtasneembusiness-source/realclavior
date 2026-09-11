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

## Style consistency

All 30 images share seed 42 and a byte-identical style block, which is what
keeps the drawings looking like one book. The trade-off is that re-running an
image reproduces it exactly, so a redo needs `SEED=43` or a sharper subject
line. See `book1/CHECKLIST.md`.
