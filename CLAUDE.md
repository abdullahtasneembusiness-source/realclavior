# CLAUDE.md — Last Known Position

Read this file fully before any task. It is not background reading.
These are operating rules, and several of them cost real money when
ignored.

---

## 0.0 AMENDMENTS — these override the sections named below

Directed by the operator after the original file was written. Where an
amendment conflicts with a later section, **the amendment wins.** The
original text is left intact below so the reasoning behind each rule is
still visible.

**A1 — Script register. Supersedes §5.2 and the register half of §2.3.**
The narration is deliberately **conversational and human**. Direct address
("Look at the typos", "I want to show you the map") is wanted, not banned.
The reasoning in §5.2 was to prevent hype and false drama — that still
holds. What is permitted now is warmth and a thinking-aloud voice; what
remains forbidden is hype, "little did they know", speculation dressed as
fact, and reaching for tension the facts already supply.
*§5.1 accuracy rules are untouched and remain absolute.*

**A2 — Image aesthetic. Supersedes §3.1, §3.3, §3.4.**
Images are **deliberately not photographic**. The target is a *designed,
illustrated, premium 3D* look — an artist's rendering of the place and
moment, not a simulated photograph of it. It should read as authored: a
designer depicting what was happening, closer to painting or stylised
animation than to a camera. "Could this be a stock photo?" is replaced by
its inverse: **if it looks like a photograph, it is rejected.**
The §3.1 rule (amateur, available light, film stock, lens flaws) is void.

**A3 — Banned vocabulary. Supersedes §3.2.**
The word ban is lifted. It existed to stop generic photoreal AI output;
under A2 the target is different, and rich art-direction language is now
required. Prompts should be **as descriptive and specific as possible**.
Generic prompting is still the failure mode — the fix is now precision,
not abstinence.

**A4 — LoRA. Reinforces §3.5.**
A style LoRA is to be trained, on operator-supplied reference images, and
applied to all production imagery. §3.5 stands: **no production imagery is
generated before the LoRA exists.**

**A5 — Standard.** Every layer — hook, title, script, voice, stills,
diagrams, motion, transitions, assembly — is dialled in and synchronised.
Merely acceptable output is rejected under §7's standing rule.

**Unchanged and still absolute:** all of §1 (cost), §2.1/§2.2/§2.4/§2.5
(voice handling), §5.1 (accuracy and sourcing), §4 (Remotion), §6, §7.

---

## 0. What this project is

A faceless YouTube documentary channel reconstructing survival
incidents, disappearances, and expeditions that went wrong —
mountaineering, caving, maritime, wilderness.

**The differentiator is spatial reconstruction.** Every video shows
where the incident happened, in real geography, with the route, the
timeline, and the exact point where things diverged from the plan.
Coded diagrams carry the explanation. Narration supports them. Still
imagery is atmosphere between diagram beats — never the main event.

The channel competes against staffed teams with human illustrators.
It wins on visual precision, not volume. Output that is merely
acceptable is a failure, because acceptable is what the competition
already produces at ten times the rate.

The operator is non-technical. He directs; you build. Explain
decisions in plain language. Never assume he will read the code to
understand what happened.

---

## 1. COST RULES — read twice

Money has already been wasted on this project through automated
retries and unapproved batch generation. These rules are absolute.

### 1.1 Never call a paid API without explicit approval in the current session

Paid APIs: ElevenLabs, Replicate.

Before the first paid call of any task, print:

```
PAID CALL REQUEST
  Provider:        <name>
  Operation:       <what>
  Units:           <n images / n characters>
  Est. cost:       $<amount>
  Cumulative today:$<amount>
Proceed? (waiting for explicit yes)
```

Then **stop and wait**. Do not proceed on silence. Do not proceed on
an ambiguous reply. Only an explicit yes.

### 1.2 Never retry a failed paid call automatically

If a paid call fails, errors, times out, or returns something
unusable: **stop**. Report what happened, what it cost, and what you
propose. Wait for instruction.

Automatic retry is forbidden even when the failure looks transient.
Three silent retries is how the last session burned credits.

### 1.3 One before many

Any batch of images or audio segments: generate exactly **one** as a
sample. Present it. Wait for approval. Only then generate the rest.

Never generate a full set to "see how it looks."

### 1.4 Ledger

Maintain `costs.jsonl` in the project root. Append one line per paid
call:

```json
{"ts":"<iso>","provider":"replicate","op":"flux2-pro","units":1,"usd":0.055,"note":"wp3 tent exterior"}
```

Print the running total at the end of every session.

### 1.5 Session ceiling

Default ceiling is **$5 per session**. On reaching it, stop all paid
calls and report. Do not continue even mid-task. The ceiling is
raised only by explicit instruction, per session, never permanently.

### 1.6 Cache absolutely everything

Every generated asset is written to disk immediately with a
deterministic filename derived from a hash of its prompt and
parameters. Before any generation, check whether that file already
exists. If it does, use it. Never regenerate an existing asset.

### 1.7 Test on free paths

Remotion renders, ffmpeg assembly, depth maps, and layout iteration
are all free and local. Iterate there. Only spend money once the
composition is final and you know exactly what asset is needed.

---

## 2. VOICE STANDARD

### 2.1 The voice is pinned. It never defaults.

`config/voice.json` holds the voice ID and every generation
parameter. Every ElevenLabs call reads from it. If the file is
missing or the ID is absent, **stop and ask** — do not fall back to a
default voice.

A default voice was shipped once. It sounded like a text-to-speech
demo and was wrong for the channel.

### 2.2 Audition once, lock forever

Voice selection happens exactly once, deliberately:

1. Pick 5 candidate voice IDs from the ElevenLabs library
2. Generate the **same 25-second passage** with each — real script,
   not a test sentence
3. Present all five
4. Operator picks one, it goes in `config/voice.json`, done

Budget for this is ~$1. It is the one place worth spending before
approval, because every video afterwards depends on it.

### 2.3 What the voice must be

Measured, low, unhurried. A narrator who already knows how the story
ends and is not enjoying it. Documentary register — think incident
report read aloud, not thriller trailer.

Explicitly wrong: bright, energetic, upbeat, conversational,
"engaging," anything that sounds like an explainer channel or an ad.

### 2.4 Segment-level generation

Never generate a full narration in one call.

Split the script into segments at paragraph boundaries. Generate each
separately as `audio/seg-<nnn>-<hash>.mp3`. Assemble with ffmpeg.

Reason: one bad line then costs one segment to fix, not the whole
video. A full-script regeneration to fix a single mispronunciation is
a waste and is forbidden.

### 2.5 Settings baseline

Stability high, style low. This narration must not perform. If a
segment sounds theatrical, lower style before touching anything else.

---

## 3. IMAGE STANDARD — the section that matters most

Generated imagery has been the biggest quality failure so far. The
output looked like stock photography. That is fatal for this channel,
because stock-looking imagery is precisely the signal that gets
content classified as mass-produced.

### 3.1 The governing idea

> **The images should look like they were taken by the people in the
> story, not by a cinematographer hired to dramatise it.**

Amateur. Available light. Wrong moment. Slightly bad framing. A
camera that was cold, or wet, or being held by someone tired.

This one instruction does more work than any parameter. Apply it to
every prompt.

### 3.2 Banned vocabulary

These words produce the stock look. Never put them in a prompt:

`cinematic` · `epic` · `dramatic lighting` · `golden hour` ·
`breathtaking` · `stunning` · `majestic` · `award-winning` ·
`masterpiece` · `hyperrealistic` · `ultra-detailed` · `8k` · `4k` ·
`volumetric lighting` · `god rays` · `sharp focus` · `professional
photography` · `trending on artstation`

If a prompt contains any of these, rewrite it before generating.

### 3.3 Prompt template

Every image prompt is built from these slots, in this order:

```
<subject and what is happening>,
<time of day + actual weather>,
<light source, named literally>,
shot on <film stock or camera>, <focal length> lens,
<framing imperfection>,
<colour cast and grain>,
<one physical flaw>
```

**Good:**

> A weathered orange dome tent half-buried in wind-packed snow on an
> exposed col, late afternoon under flat high overcast, no direct
> sun, shot on Kodak Portra 400 pushed one stop, 35mm lens, framed
> slightly off-centre and hurried, muted blue-grey with dull orange,
> heavy grain, faint condensation across the lower corner of the lens

**Bad:**

> Epic cinematic shot of a tent on a majestic snowy mountain, golden
> hour, dramatic lighting, 8k, hyperrealistic

The bad one is what a generic pipeline produces. It will look like
every other AI channel.

### 3.4 Fixed style anchors

Unless a shot specifically requires otherwise:

- **Light:** overcast, blue hour, low sun, headlamp, or flash. Never
  a beautiful sunset.
- **Palette:** desaturated. Cold blues and greys, granite, snow-white,
  with at most one warm accent (tent fabric, jacket, a lamp).
- **Grain:** always present and visible.
- **Framing:** off-centre, occasionally cut off, never symmetrical.
- **Era cue:** if the incident is pre-2000, the image must look like
  it came from film of that period — including the flaws.

### 3.5 The LoRA

A style LoRA is trained on Replicate early and applied to every
generation. Once trained, its trigger word goes in `config/image.json`
and is prepended to every prompt automatically.

Do not generate production imagery before the LoRA exists. Images
made without it will not match the ones made after, and the
inconsistency is visible across a video.

### 3.6 Rejection test

Before accepting any generated image, ask:

> Could this plausibly be a stock photo?

If yes, it is rejected. Do not use it, do not "fix it in the edit."
Rewrite the prompt with more specific physical detail and more
imperfection.

Second test: does it contain information, or is it decoration? A
decorative image is acceptable only as a transition. If a shot is
carrying meaning, it should probably be a diagram instead.

---

## 4. REMOTION STANDARD

### 4.1 Components are data-driven, always

A component never contains story content. Coordinates, labels,
elevations, and timings are props. The same route component must
serve a mountain in Nepal and a cave in Kentucky without edits.

If you find yourself hardcoding a place name inside a component, stop
and lift it to props.

### 4.2 The library is the asset

Build reusable components, not one-off videos. Current set:

- `RouteFlythrough` — animated route, camera follow, elevation
  profile, timed callouts (exists; use as the pattern)
- `DepthPanel` — still image with depth-map parallax
- `TimelineStrip` — chronological events
- `Callout` — leader-line labels
- `CrossSection` — vertical slice for caves, wrecks, shafts

Each new story should be producible by supplying data to existing
components. If a story needs new code, that code becomes a component,
not a special case.

### 4.3 Design tokens

All colour and type lives in `src/theme.ts`. No hex values inside
components.

Palette is cold and forensic: near-black ground, granite mid-tones,
snow-white text, muted sage contour lines, a single amber signal
colour for the route, desaturated red reserved exclusively for the
moment things go wrong. Red is never decorative.

### 4.4 Motion rules

- Camera moves are slow and continuous. No snap cuts inside a
  diagram sequence.
- Nothing bounces. No easing that overshoots. This is a document, not
  a title sequence.
- Text appears by fade and slight position change only.
- If an animation draws attention to itself rather than to the
  information, it is wrong.

### 4.5 Timing derives from data

Callouts fire when the animation physically reaches their waypoint,
computed from route distance. Never hand-place a timing number that
breaks when the duration changes.

### 4.6 Legibility floor

Every frame is checked at phone size. Body text minimum 28px at
1080p. Contour lines minimum 1px at final scale. If a label is
unreadable on a phone, it does not exist.

---

## 5. SCRIPT STANDARD

### 5.1 Accuracy is not negotiable

These are real people, many of whom died, with families alive today.

- Every factual claim traces to a named source
- Maintain `sources.md` per video with a line for each claim
- Never invent dialogue, thoughts, or final moments
- Never state a cause that the investigation left open
- Where the record is uncertain, say so in the narration

If a fact cannot be sourced, cut the sentence. Do not soften it into
a vague version and keep it.

### 5.2 Register

Plain, declarative, unhurried. Short sentences. No rhetorical
questions. No "little did they know." No addressing the viewer. No
speculation dressed as fact.

The subject matter supplies the tension. The writing must not reach
for it.

### 5.3 Structure

Open with a concrete detail from the middle of the event, not a
summary. Establish geography early, because the diagrams depend on
the viewer holding a mental map. Move chronologically after that.
Close on what changed afterwards — procedure, equipment, regulation —
never on a moral.

### 5.4 Script and visuals are written together

Every script paragraph is tagged with what is on screen during it. A
script that cannot be storyboarded is not finished.

---

## 6. ASSEMBLY

- Narration is the master timeline. Visuals cut to the audio, never
  the reverse.
- Diagram beats align to the sentence that explains them, within
  200ms.
- Silence is allowed. Two seconds of terrain with no narration is a
  legitimate choice.
- Music sits low and never swells at a death.
- Final render 1920×1080, 30fps, H.264, target ~12 Mbps.

---

## 7. SESSION PROTOCOL

**At the start of every session**, state:
1. What you understand the task to be
2. Which paid APIs it will touch, if any
3. Estimated total cost

Then wait.

**During work**, stop and ask when:
- A paid call is needed (§1.1)
- Anything fails (§1.2)
- A choice would change the look or sound of the channel
- The task seems to require deviating from this file

**At the end of every session**, report:
- What was produced
- Total spend, from `costs.jsonl`
- What is unfinished

### The standing rule

When output would be merely acceptable, stop and say so rather than
shipping it. A blank frame is recoverable. A generic one that gets
published is not.

Asking costs nothing. Generating costs money. When uncertain, ask.
