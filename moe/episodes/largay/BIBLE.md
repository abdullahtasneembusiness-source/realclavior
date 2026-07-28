# Episode 01 — Geraldine Largay

**Margin of error** · Appalachian Trail, Maine · July 2013 – October 2015
Target length: 13:00–14:00

---

## 1. The thesis (everything serves this)

> **She did almost everything right. Each correct decision made her harder to find.**

This is not a story about a mistake. It's a story about a chain of *reasonable* choices
that, plotted in space, close like a trap. That's the channel in one sentence — and it's
why this is episode one.

**The detail the whole video is built around:** three cadaver-dog teams passed within
~100 yards of her camp and did not find her — because she was inside her tent, and the
tent contained her scent. **The shelter that kept her alive is what hid her from rescue.**

That single fact is the payoff of the master curiosity loop. Everything before it is
setup; everything after it is consequence. Do not spend it early.

---

## 2. Title & thumbnail

Research is consistent on what works: a **specific, concrete curiosity gap** — a viewer
must be unable to guess the answer, but must believe the answer exists and will be given.
Vague drama ("Horrifying," "Disturbing") is the saturated end of this niche and reads as
interchangeable. Numbers and paradox outperform adjectives.

**A curiosity gap only works if it's anchored.** A title built purely on mystery
("They Came Within 100 Yards of Her") fails, because a stranger scrolling a feed can't
tell who *they* are, who *her* is, or 100 yards of *what*. There's nothing to be curious
*about* yet. The rule: **give the situation, withhold the explanation.** The viewer should
understand the scenario in one glance and still not be able to guess the answer.

Every title below carries three things: **who/what happened** (a lost hiker),
**a concrete number** (credibility + scale), and **an unresolved contradiction** (the gap).

**Recommended title:**
> ### She Survived 26 Days Lost. The Search Walked Past Her Three Times.

62 characters — survives mobile truncation. "Lost" and "the search" instantly establish
the scenario; "26 days" is the impressive fact that earns the click; "walked past her
three times" is the contradiction that can't be resolved without watching. Nothing is
vague, and nothing is spoiled.

**Alternates, ranked:**
2. *Lost 2 Miles From the Trail — And the Search Dogs Walked Right Past Her*
   Strongest context of the set (names the trail scenario outright). Slightly long.
3. *She Did Everything Right When She Got Lost. That's Why They Never Found Her.*
   Best pure paradox, and closest to the channel's thesis. Weaker on concrete numbers —
   a good A/B test against #1 once the channel has an audience that trusts the format.
4. *The Lost Hiker Rescuers Walked Past Three Times*
   Cleanest and shortest. Least specific, so probably the weakest cold-start performer.

**Avoid:** anything with "Horrifying / Disturbing / Chilling." That's the competitor's
saturated lane and it signals reaction content, not reconstruction.

**Thumbnail — this is our unfair advantage.**
Nobody else in this niche can make this image. Use our own diagram style:
- Dark topographic map, our signature orange route
- The AT as a line · her camp as a marked point · **three dog-team tracks sliding past**
- One label: **`100 YDS`** with a measured bracket between camp and nearest track
- No face, no stock photo, no red arrows

Every competitor thumbnail is a photo of a forest or a person. Ours is *information*.
It looks like evidence. That contrast is the click.

---

## 2b. Still-image look

Defined channel-wide in `moe/style.json`, not per episode — every video inherits it.

**Premium stylized 3D, not photography and not cartoon.** Cinematic CGI: volumetric fog,
rim lighting, realistic materials, shallow depth of field, cold slate-blue palette with a
single warm accent that ties to the orange route line in the diagrams.

Two reasons this is the right call beyond taste:
1. **It parallaxes properly.** The depth-displacement panel keys off foreground /
   midground / background separation. Rendered 3D scenes have that separation by
   construction; flat photographs often don't, and they smear when displaced.
2. **It's ownable.** Photoreal stock imagery looks like everyone else's channel. A
   consistent 3D look becomes recognisable at thumbnail size — and it's what the trained
   LoRA will eventually lock in.

Episode `images.json` files describe **subject only**. Style is appended automatically.

---

## 3. Retention architecture

Benchmarks worth designing against: most videos lose 30–40% of viewers in the first
30 seconds; 50–60% average retention is solid, 70%+ gets pushed. Documentary/explainer
audiences tolerate a **longer 30–45s hook** because they expect context before committing.

**Four loops, deliberately staggered so one is always open:**

| Loop | Opened | Paid off | Question in viewer's head |
|---|---|---|---|
| **A — master** | 0:35 | ~9:15 | Why didn't the dogs find her? |
| **B — distance** | 0:25 | ~4:30 | How far away was she, really? |
| **C — the journal** | 1:40 | drip: 10:00–12:00 | What did she write? |
| **D — who found her** | 0:50 | ~12:20 | If not the search, then who? |

**Rehook cadence:** a new spatial reveal or reframe every 45–70 seconds. In practice that
means the map does something the viewer didn't expect — a distance measured, a boundary
drawn, a track overlaid — at a steady beat. Narration never runs more than ~70 seconds
without the diagram advancing the argument.

**The one rule:** never state a distance without showing it. "Two miles" spoken over a
forest photo is nothing. "Two miles" drawn against the trail she was trying to reach is
the entire video.

---

## 4. Voice

Conversational, human, first-person-adjacent. We are thinking alongside the viewer, not
reading at them.

- **Short sentences. Then a longer one that lets the thought settle.**
- Direct address is allowed and encouraged: *"Look at the typos."* / *"I want to show you the map."*
- Contractions always. This should sound like a smart friend explaining something they
  can't stop thinking about.
- **Restraint at the emotional peaks.** When the journal comes in, the writing gets
  *plainer*, not more dramatic. Let her words carry it. Any adjective we add there steals
  from her.
- Never speculate past the record. When something is unknown, say it's unknown — that's
  more credible and more unsettling than filling it in.
- No moral at the end. Present the geometry; let the viewer feel the conclusion.

**Tonal red lines:** she died in 2013 and her husband George and daughter Kerry are
living. No dramatized final moments. No blame — not of her, not of the wardens. The
Warden Service's own review is the spine; they were candid about what went wrong, and
using their candor respectfully is both more ethical and better television.

---

## 5. Beat sheet

| # | Time | Beat | Primary visual |
|---|---|---|---|
| 0 | 0:00–0:50 | **Cold open** — the text, the number, the paradox | Text message on black → map pull-back |
| 1 | 0:50–3:00 | Who she was, the plan, the system with George | RouteFlythrough — planned leg |
| 2 | 3:00–4:45 | **The divergence** — steps off trail; how little it took | Zoom to the step-off; 30-yard scale bar |
| 3 | 4:45–7:15 | **The drift** — uphill for signal, away from the trail | ElevationProfile + route; the fatal irony |
| 4 | 7:15–10:00 | **The search** — scale, the 18 hours, the three passes | SearchProximity overlay ← new component |
| 5 | 10:00–12:00 | **26 days** — the journal | TimelineStrip + typographic entries |
| 6 | 12:00–13:30 | **The find & the point** | Full map, all layers, final pull-back |

**New component required:** `SearchProximity` — search-team tracks plus distance rings
from a fixed point, animating closest approach. Reusable for every future SAR story.

---

## 6. Facts — verified vs. to verify

**Solid (multiple independent outlets):**
- Text sent 11:01 a.m., July 22, 2013; never delivered. Verbatim, typos intact:
  *"In somm trouble. Got off trail to go to br. Now lost. Can u call AMC to c if a trial
  maintainer can help me. Somewhere north of woods road."*
- Journal, Aug 6, 2013: *"When you find my body, please call my husband George and my
  daughter Kerry. It will be the greatest kindness for them to know that I am dead and
  where you found me – no matter how many years from now."*
- Entries continue to Aug 10; then nothing until a final entry Aug 18 — 27 days after
  she got lost. Survived at least 26 days.
- Three cadaver-dog teams came within ~100 yards of the site.
- Dogs could not detect her because her remains were inside the tent.
- Wardens began searching in earnest ~18 hours after the report; 92% of wilderness
  missing-person cases are resolved within 12 hours.
- Wardens cited terrain and a shortage of trained, fit personnel as limits on grid searching.
- Remains found 2015 by a contractor doing a forestry/environmental survey on US Navy land,
  ~100 yards inside the Navy SERE School boundary.
- Maine Warden Service released 1,500+ pages under Freedom of Access Act requests.

**⚠ Verify before final cut:**
1. **Date of discovery** — sources conflict between **August 2015** and **October 14, 2015**.
   Most reporting (Portland Press Herald, Bangor Daily News, Warden Service) supports
   **October 14, 2015**. Confirm against the Warden Service report before the script is locked.
2. **Exact distance off-trail** — reported variously as "~3,000 yards," "two miles," and
   "two or three miles." Pick one sourced figure and use it consistently; the map must match it.
3. **Number of texts** — at least two unsent messages are documented; confirm the count
   and timestamps.
4. Her companion Jane Lee's departure timing and reason — confirm before stating.

Primary/major sources to work from directly: the Maine Warden Service FOAA release;
Boston Globe Magazine, *"When you find my body": The last days of Gerry Largay*;
D. Dauphinee, *When You Find My Body* (2019).

---

## 7. Sources

- Maine Warden Service FOAA release (1,500+ pp.) — obtain directly
- [Boston Globe Magazine — "When you find my body"](https://www.bostonglobe.com/magazine/2016/08/24/when-you-find-body-the-last-days-hiker-gerry-largay/DcaZf6RcojOTN2LNsOXm0K/story.html)
- [CNN — Lost hiker's message](https://edition.cnn.com/2016/05/26/us/missing-hiker-gerry-largay-last-messages)
- [Bangor Daily News — alive at least 26 days](https://www.bangordailynews.com/2016/05/25/news/report-missing-hiker-was-alive-for-at-least-26-days-after-her-disappearance/)
- [Central Maine — "A cautionary tale: the perfect storm"](https://www.centralmaine.com/2016/09/17/a-cautionary-tale-the-perfect-storm-the-fate-of-geraldine-largay/)
- [The Bollard — M.I.A. on the A.T.](https://thebollard.com/2016/07/04/m-i-a-on-the-a-t-no-escape/)
- [Portland Press Herald — remains found](https://www.pressherald.com/2015/10/16/authorities-believe-they-found-skeletal-remains-of-appalachian-trail-hiker-missing-since-2013/)
- [Wikipedia — Disappearance of Gerry Largay](https://en.wikipedia.org/wiki/Disappearance_of_Gerry_Largay)
