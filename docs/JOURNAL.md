# Kulpio — Development Journal

*Project journal for the firSTep portfolio. Every date and milestone below
comes from the project's real commit history (240+ commits) — the full,
unedited log is public in the repository.*

> **Note to self before submitting:** read this through and add your own
> memories — what you felt, where you were stuck, what a family member said
> when they tried it. Judges value the honest, personal details most.

---

## Week 1 — a fridge that knows (Jun 30 – Jul 6)

**Jun 30.** First real version: a fridge list with live freshness colouring,
expiry estimates from a built-in shelf-life table, settings, and a service
worker so the app opens with no internet. Also my first *deletion*: I built a
"smart action bar" of adaptive shortcuts and removed it the same day — it
competed with the content instead of helping. First lesson: **every pixel has
to earn its place.**

**Jul 1.** The three chips at the top became the heart of the app: **Used /
Froze / To buy** — the food loop. Replaced the generic assistant bird with a
pear mascot and recoloured the whole app around him (green, orchard-like).
Added expiry notifications, backup/restore and waste tracking. Built
voice-add and a "Cook it" button — and reverted the whole batch the same day
when it made the app feel bloated. Second lesson: **being able to undo a bad
day is why small commits matter.**

**Jul 2.** Gave the pear a personality: he naps, blushes, celebrates an
all-clear fridge with a party hat, and lives under a day/night sky with real
weather. It sounds like decoration, but it's the motivation layer — the pear
*reflects the state of your fridge*, so caring for him means caring for your
food. Also shipped the shopping→fridge loop, the waste-free streak and
search/filters.

## Week 2 — killing the friction (Jul 7 – 13)

**Jul 7–8.** The week of input. Nobody keeps a food diary forever, so typing
had to almost disappear: multi-add with duplicate merging, quantities,
product photos from Open Food Facts plus your own camera, brand suggestions
with the exact pack photo, swipe gestures (right = used it, left = wasted
it), and undo everywhere. Set up CI so 300+ automated checks run on every
push — with the network blocked, because offline is a promise, not a hope.
Moved hosting to a single Cloudflare Worker that serves the app *and* its
API — one command deploys everything.

**Jul 11.** AI went live — with a free model as the default brain and a
better one as an optional upgrade. The hard part wasn't wiring it up; it was
making 33 languages sound *native*. Machine translations kept producing
calques («Stoc de pui» instead of «Supă de pui»), so I added rules that keep
qualifiers («griechischer Joghurt», never just «Jogurt») and a structure test
that guards every translation table.

**Jul 12–13.** The "week ahead" strip (what expires when, seven days out),
achievements with confetti, and **money at risk** — pricing up what's about
to spoil. Watching euros appear next to dying food changed how the app feels:
suddenly it's not a list, it's a warning.

## Week 3 — the scanner and the household (Jul 14 – 19)

**Jul 14.** Redesigned Home into a calm dashboard — one floating add button,
tools only when the fridge is big enough to need them.

**Jul 15–16.** Rebuilt scanning until it felt like a real scanner app:
instant reads, a proper product card, a torch for dim shelves, and
**teach-it-once** — an unknown barcode learns from the user and answers
offline forever after.

**Jul 17–19.** The receipt scanner: one photo of a till receipt and the whole
shopping lands in the fridge — after an editable review step, because AI must
never silently write into your data. Then the **shared household**: first the
shopping list, then the entire fridge, synced through one code. The hardest
bug of the project lived here: two phones editing at once clobbered each
other's changes. The fix — merge members, activity and messages by id on the
server instead of overwriting whole state — took longer than the feature
itself. Also: web push that names what's expiring, and label-scanning that
reads **printed best-before dates** straight into the form, because a printed
date always beats any estimate.

## Week 4 — trust, polish, and proof (Jul 20 – 23)

**Jul 20–22.** Discover tab, profile rework (avatars, levels, tier titles),
responsive hardening on every phone size, the shared-fridge activity feed and
chat, and account sync that pulls fresh data when the app returns to the
foreground.

**Jul 23.** The trust day: login rate-limiting, GDPR data export and *real*
account deletion; the licence (open source under AGPL v3); the docs — an
architecture write-up, a transparent impact model (clearly labeled a
projection, never a study) and a protocol for a real micro-study with
families. Then the competition materials, and a final design pass: freshness
**rings** on every item, a live **countdown to the next expiry** on the hero,
and a cleaner, icon-only scan button.

---

## What I'd tell my past self

1. **Delete faster.** The best five features I built are ones I removed
   (smart bar, voice assistant, wardrobe, mod menu…). The app got better
   every time it got smaller.
2. **Never trust an estimate over a fact.** The moment printed dates started
   beating AI guesses, people started trusting the app.
3. **Offline is a feature you must test, not promise.** Blocking the network
   in the test suite caught more real bugs than anything else.
4. **Small commits, always.** 240+ commits meant every mistake was one
   `revert` away from gone.
