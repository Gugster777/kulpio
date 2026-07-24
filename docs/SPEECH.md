# Kulpio — Presentation Speech

A spoken script that follows the 15 slides of `Kulpio_firSTep.pptx` /
`Kulpio_Infomatrix.pptx`, one section per slide. Written to be *said*, not read.
Total run time ≈ **6 minutes** at a calm pace. `[…]` are stage directions, not lines.

**Delivery tips**
- Look up from the slide — the slide is the backdrop, you are the presentation.
- One breath between slides. Let the big numbers land; don't rush them.
- Have the app open on `?demo=1` before you start, so slide 7 is a real tap, not a video.
- If you're short on time, the cuttable slides are 12 and 13 — the story survives without them.

---

## Slide 1 — Title  *(≈20s)*

"Good [morning]. My name is Daniil Bejenari, and this is **Kulpio** — a food-freshness
tracker that lives in your pocket.

Its whole job is three words: **waste less food, save money — in any language.**
Let me show you why I built it."

## Slide 2 — Why I built this  *(≈25s)*

"This started in my own fridge. I kept watching good food go bad — things I *bought*,
with the best intentions, pushed to the back of the shelf, forgotten, and then thrown out.

And that really bothered me, because it isn't a money problem or a laziness problem —
it's a **memory** problem. So I set myself one line to solve:
*'Don't let me forget the food I already own.'*"

## Slide 3 — The problem  *(≈30s)*

"It turns out I'm not alone. **About a third of all the food we produce is wasted** —
that's the UN's number. And the single biggest place it happens isn't farms or shops —
it's **our homes.**

At home the cause is almost always the same: we buy it, we forget it, it expires.
[pause] Which is the good news — because a **forgetting** problem is exactly the kind
of problem software can fix."

## Slide 4 — UN Global Goals  *(≈25s)*

"That's why I built Kulpio straight onto the **UN Sustainable Development Goals.**
Its core mission is **Goal 12** — responsible consumption. It also touches **Goal 2**,
zero hunger, by valuing the food we already have, and **Goal 13**, climate action,
because wasted food means wasted emissions.

UN Target 12.3 asks the world to **halve** food waste by 2030. Kulpio goes straight at
the biggest, most-forgettable slice: the household."

## Slide 5 — The idea  *(≈25s)*

"The idea is a simple loop of three steps.

**One — add it in seconds.** Scan a barcode, photograph a label or a receipt, or paste
a list. No typing marathon.
**Two — know what's going off.** Printed dates always win; everything else gets a live
freshness colour.
**Three — use it in time.** Cook what's expiring first, and watch the money you save add up."

## Slide 6 — See it  *(≈20s)*

"And it's real, working software — not a mock-up. Here you can see it scanning a product
and showing its Nutri-Score, your saved-money dashboard, and a **shared fridge** a whole
family can use from one code. One app, offline, on any phone."

## Slide 7 — A closer look  *(≈45s — LIVE)*

"Actually — let me just show you the real thing.

[Open the app on your phone / mirrored screen.]
This is the home screen: what's expiring today, the week ahead, my whole fridge at a glance.
[Tap a product.] Every item is one tap to edit.
[Tap Add → scan.] And here's the fastest way in — I'll scan a real barcode…
[scan the product you brought] …and Kulpio reads the product straight off the pack.

That's the entire daily habit: a few seconds, and nothing gets forgotten."

## Slide 8 — Features  *(≈25s)*

"Underneath that simplicity there's a lot: effortless input by barcode, AI label and
receipt scanning; separate fridge, freezer and pantry sections; recipes built from your
own ingredients; a shared household with an activity feed and chat; achievements and levels
to keep you going — and all of it in **33 languages**, including full right-to-left."

## Slide 9 — Methodology  *(≈30s)*

"Now, how does it actually know *when* food expires? This is the part I'm most careful about.

**Printed dates are the ground truth** — if there's a date on the pack, that always wins.
Only when there's no date does Kulpio estimate, from a built-in offline shelf-life table
that adjusts for storage — the freezer adds months, an opened pack shortens things.
And when you're online, the AI refines that estimate. If the AI isn't available, it quietly
falls back — it never blocks you."

## Slide 10 — Under the hood  *(≈30s)*

"The engineering choice I'm proudest of: the entire app is **one static HTML file** —
no framework, no build step — with a service worker that makes it work fully **offline.**

The backend is **one Cloudflare Worker** that serves both the app and the API from a single
URL, with a D1 database for accounts, sync and households, and web-push for reminders.
It's small, it's fast, and it installs from anywhere."

## Slide 11 — Impact  *(≈30s)*

"So what's the impact? Let me be honest about this number.

Using published food-waste research, at a middle-of-the-road effectiveness, Kulpio could
save a household on the order of **€128 a year** and cut roughly **30%** of wasted items.
I'm calling that a **projection from a transparent model — not a study.** And the app has
the CSV export built in to run the *real* pilot: a baseline week versus a Kulpio week.
That honesty matters more to me than a big number."

## Slide 12 — Privacy & security  *(≈20s)*

"Because it handles your habits, it's **private by design.** Your fridge stays on your
device unless you choose a networked feature. You can export everything as JSON in one tap,
and *delete* really deletes — account, sessions, synced data. Passwords are hashed with
PBKDF2 and logins are rate-limited."

## Slide 13 — The journey  *(≈25s)*

"Getting here meant solving real problems. Making it work with no network meant precaching
the whole app. Making the dates trustworthy meant deciding printed dates always beat AI.
Killing the typing meant four fast ways to add food. And letting two phones share a fridge
meant merging data on the server so nobody clobbers anyone."

## Slide 14 — What's next  *(≈20s)*

"Where it goes next: a native **Android app** on the Play Store — it's already packaged as
a TWA — running the real user pilot and publishing measured results, and a shareable monthly
impact report. And it's **free and open-source** under the AGPL."

## Slide 15 — Closing  *(≈15s)*

"Kulpio is a food-freshness tracker that fits in your pocket, in your language, and helps
households everywhere waste less and save more.

**Waste less. Save more. Together.** Thank you — I'd love to take your questions."

---

### If a judge asks…

- **"Is the €128 real?"** — "It's a projection from published averages, clearly labelled as
  a model. The app is instrumented to measure the real figure with a small pilot — that's
  the honest next step, not a claim I'm making today."
- **"Why not a normal app?"** — "One offline HTML file installs anywhere, works with no
  signal, and updates instantly. It's the most reliable way to reach the phones this is for."
- **"What's actually yours?"** — "The whole thing — the app, the offline estimation, the
  worker and database, the design, all 33 languages. It's open-source; the code is public."
- **"Data privacy?"** — "Local-first by default; one-tap export; real deletion; hashed
  passwords and rate-limited logins."
