# Reference analysis — what the benchmark video actually does

Source: operator-supplied clips + full transcript of a Caesar assassination
documentary. Frames extracted and examined; transcript read in full.

This file exists so the findings survive the session. It is the spec the
episode should be judged against.

---

## Part 1 — The visual system

### 1.1 The core finding: this is not generated imagery

The same senate chamber, the same figures and togas appear from an overhead
wide, an over-the-shoulder from inside the crowd, and a two-shot in a doorway.
**Same world, moved camera.** These are 3D scenes — built sets and reusable
models, shot from many angles.

**Implication, and it is the important one:** a Flux LoRA can imitate the *look*
of a single frame. It cannot hold the same set and the same people consistent
across thirty shots from different angles. Cross-shot consistency is the single
thing diffusion is worst at, and it is exactly what makes this reference feel
authored rather than assembled.

To reach this standard, the story-critical visuals have to be **real 3D**, not
generated stills.

### 1.2 The massing model — the technique to steal first

The strongest frame is an aerial of the Portico of Pompey rendered as a
**simplified architectural massing model**:

- The whole city is plain grey blocks — deliberately unreal, clearly a *model*
- Only the relevant structure is picked out: lighter tone, thin white outline
- Everything else is dark and muted so attention has nowhere else to go
- **Labels sit in 3D space, in perspective, lying on the geometry** —
  "PORTICO OF POMPEY" runs along the courtyard at its angle, "CURIA" sits on
  the building it names
- Warm lit courtyard against cold dark surroundings

This is our thesis rendered exactly: *show the space, mute everything that
isn't the point, label it in place.*

**It maps onto Largay one-to-one:** terrain as simplified massing, the AT
corridor picked out in the accent colour, everything else grey, "APPALACHIAN
TRAIL" lettered along the trail in perspective, her camp outlined the way the
Curia is.

**And it is fully achievable in Three.js inside Remotion.** Simple geometry,
flat materials, text positioned in 3D. No generation, no per-image cost,
re-renderable forever, and driven by the coordinate data we already have.

### 1.3 Colour as information

Caesar wears red. Every other figure is white or cream. You know who to watch
before a word is spoken, and you track him across every shot without effort.

Our rule follows: **everyone and everything neutral grey; the subject and the
route carry the single warm accent.** This is already §4.3 in CLAUDE.md — the
reference confirms it and shows how far it can be pushed.

### 1.4 The label system

Two label styles, both on translucent dark plates:

- **Lower-left, contextual:** small caps line ("15TH OF MARCH") above a heavy
  bold line ("44 BC"), with a small square accent block to the left
- **Upper-right, identifying:** same construction, right-aligned, placed near
  the subject it names ("DICTATOR / JULIUS CAESAR")

Two can be on screen at once without collision because they are anchored to
opposite corners. This is very close to the `LowerThirdCallout` already built —
it needs a corner-anchoring option and the accent block.

### 1.5 The diagram treatment

The pure map shot is a different register again: black ground, white line art
with visible dither/halftone texture, a drawn frame box, stencil caps for
primary labels ("MAP OF ROME", "44 BC"), handwritten script for secondary ones
("City Walls", "River Tiber"), leader lines, and a CRT-ish vignette.

That is a **post-processing layer** over vector geometry — entirely doable as a
shader/filter pass over the route components that already exist.

### 1.6 Tilt-shift

Wide shots use heavy tilt-shift blur, which is what makes them read as a
*model of the event* rather than a photograph of it. This is precisely the
"designed, not real" quality the operator asked for, and it's one line of
post-processing.

---

## Part 2 — Why the script performed

### 2.1 Structural template

1. **Cold open, present tense, inside the room.** "It's the 15th of March,
   44 BC in Rome." Not summary — *scene*.
2. **Establish the space before the story.** The first sixty seconds are almost
   entirely geography: which building, how far the usual venue is, that it is
   secluded, that it has no access to side streets, that the only exits lead
   onto the Portico. You feel the box close before you are told it is a box.
3. **Stop on the movement, not the violence.** "Across the room, a man rises
   from the benches and starts walking towards him." Cut. That loop stays open
   for the entire video.
4. **Hard rewind.** "To understand Caesar's death, we have to understand how he
   got here." An explicit, unembarrassed structural signpost.
5. **Escalating context** with concrete numbers and a rule-of-three breakdown
   of who conspired and why.
6. **Reassembly.** "The stage is now set. All that remains is for the signal to
   be given."
7. **The event, fast, present tense.**
8. **Then the omens — deliberately out of chronological order.** They belong
   before the death, and are told after it. Because you already know he dies,
   every omen lands as dread instead of trivia. This is the single smartest
   structural choice in the video.
9. **Close on consequence, then a historian's quote.** No moral.

### 2.2 Techniques worth taking

- **Physical specificity:** daggers carried in "wooden boxes usually used to
  carry writing tablets". Not "hidden weapons".
- **Micro-cliffhangers** ending sections: "Caesar made a fateful decision."
- **One joke at peak tension** ("the pen is not mightier than the sword") to
  release pressure without undercutting.
- **Named sourcing inside the narration** — Plutarch, Balsdon. Credibility as a
  texture, not a citation dump.
- **Irony held to the end:** he dies under a statue of Pompey, which he himself
  had refused to tear down.

### 2.3 What this means for the Largay script

Already right: the cold open on a concrete artefact (the text message), and
holding the beacon back to the end — that is the same move as holding the omens.

To change:
- **Establish the geography harder and earlier.** The reference spends its
  first minute on space. Ours introduces the map but should be more explicit
  about the shape of the trap — the trail corridor, the ground rising away from
  it, the SERE boundary — before the drift begins.
- **Add an explicit rewind signpost** after the cold open, in our register.
- **More physical specificity.** Not "her gear" — the actual objects.

---

## Part 3 — Recommendation

**Three.js scenes inside Remotion for anything the story depends on:** the
terrain, the trail corridor, the camp, the search tracks, the massing model.
Consistent by construction, free to re-render, driven by the real coordinates.

**Generated stills only for atmosphere between beats**, where cross-shot
consistency doesn't matter — and only once the LoRA exists, per §3.5.

This also satisfies §1.7 (iterate on free local paths) and §3.6 (if a shot
carries meaning it should probably be a diagram).
