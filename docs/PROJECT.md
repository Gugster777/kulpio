# Kulpio — Project Report

**A privacy-first Progressive Web App for reducing household food waste.**

Author: Daniil Bejenari · Copyright © 2026 · Dual-licensed (AGPL-3.0 / commercial)

---

## Abstract

Roughly a third of all food produced for human consumption is lost or wasted,
and households are one of the largest single contributors. Most waste at home is
mundane: food is bought, forgotten at the back of the fridge, and thrown away
after it expires. **Kulpio** is a Progressive Web App (PWA) that attacks this
problem where it happens — in the kitchen — by making it effortless to know what
you have, when it will go off, and what to cook first. It runs offline from a
single static HTML file, installs to the home screen, works in 33 languages, and
adds food only through low-friction input (barcode scan, photo/label reading,
receipt scan, or a pasted list). This report describes the problem, existing
solutions, Kulpio's design and methodology, its architecture, how it is
evaluated, and its current limitations.

## 1. Problem & motivation

- **Scale.** The FAO estimates ~1/3 of food produced globally is wasted; the UNEP
  Food Waste Index attributes a large share to households.
- **Cause at home.** The dominant household cause is not spoilage in transit but
  *forgetting* — items bought and never used in time. This is an information and
  attention problem, not a preservation problem.
- **Cost.** Wasted food is wasted money. A tool that surfaces "what's about to
  expire" and "what you could cook with it" directly reduces both waste and spend.

**Goal:** an app that (a) makes tracking food nearly free of effort, (b) tells you
what to use *first*, and (c) does so on any phone, offline, in the user's
language, without harvesting personal data.

## 2. Related work

| Product | Approach | Gap Kulpio addresses |
|---|---|---|
| **NoWaste**, **Fridgely**, **Kitche** | Manual/receipt inventory + expiry reminders | Native-app only; limited/no AI label reading; little social/household sharing; few languages |
| **Too Good To Go** | Marketplace for surplus *retail* food | Solves retail surplus, not the food already in *your* fridge |
| **Whisk / Samsung Food** | Recipe + pantry, account-centric | Cloud-first, account required; heavier; not offline-first |
| **Supermarket loyalty apps** | Purchase history | No expiry tracking or waste-reduction loop |

**Kulpio's differentiation:** an *offline-first single-file PWA* that combines (1)
multiple low-friction input paths including **AI label/receipt reading**, (2)
trustworthy expiry handling (printed dates always beat estimates), (3) a
**waste-reduction loop** (used / wasted / froze, with money saved), (4) a
**shared-fridge social layer** (members, activity feed, chat) with server-side
merge, and (5) a **privacy-first** stance (local-first storage, GDPR export +
deletion), all in 33 languages with no install from an app store required.

## 3. Solution overview

- **Track** — fridge / freezer / pantry sections; live freshness colouring; a
  "week ahead" strip of what expires when.
- **Add with minimal effort** — barcode scanner, photo/label reading, receipt
  scan → editable review, or paste a whole shopping list.
- **Expiry** — printed best-before dates take priority; otherwise an estimate is
  produced (see §4.1).
- **Close the loop** — mark items *Used / Wasted / Froze*; the app tracks money
  saved vs. money at risk and a waste-free streak.
- **Cook first what's going off** — recipe suggestions from current ingredients,
  with per-serving nutrition estimates.
- **Share** — one 6–8-char code links a household's fridge + shopping list, with a
  members list, an activity feed, and a chat.
- **Accounts (optional)** — email/OAuth sign-in syncs your data across devices.
- **Engagement** — achievements, XP levels with tier titles, a monthly recap.

## 4. Methodology

### 4.1 Expiry estimation

Kulpio treats the *printed* date as ground truth and only estimates when none is
available, in this priority order:

1. **Printed date** read from the pack via the label scanner (OCR + model), or
   typed by the user — always wins.
2. **Offline shelf-life table** — a built-in per-food estimate keyed by the item's
   canonical ingredient (e.g. "milk", "spinach"), adjusted by storage location
   (freezer extends life ~90 days; opened shortens it).
3. **AI estimate** — when a network + AI backend is available, the model refines
   the estimate from the product name.

The freshness meter shown on each card is the fraction of the item's estimated
shelf life still ahead — an approximation by design, and clearly framed as such.

### 4.2 AI pipeline

A single Cloudflare Worker exposes the AI/API. It degrades gracefully:

1. **Anthropic Claude** if `ANTHROPIC_API_KEY` is set (best quality),
2. **Cloudflare Workers AI (Llama)** as a zero-config free fallback,
3. a clean JSON error if neither is available — the app never blocks on AI.

Endpoints (dispatched by POST body key): expiry estimate, label/receipt read,
recipe + nutrition, product web-image search, the pear's one-line verdict, and
the community/account/household features below.

### 4.3 Architecture (summary; full detail in `ARCHITECTURE.md`)

- **Client:** one static `kulpio_app.html` (~12k lines: markup + CSS + JS + 33
  translation tables). No build step, no framework.
- **Offline:** a service worker precaches the app and serves it offline;
  network-first for HTML so new deploys always win.
- **Backend:** one Cloudflare Worker serves the static app *and* the API on one
  origin, backed by Cloudflare **D1** (SQLite) for accounts, per-user sync,
  households, community scans/prices, and push subscriptions.

### 4.4 Data sync & sharing

- **Account sync** — a per-user JSON blob (`userGet`/`userSet`) follows the
  account across devices; pushed on change, pulled on foreground.
- **Household sync** — a shared blob per code. The fridge + shopping list are
  whole-state last-write-wins, but **members, activity and chat are merged
  server-side** (deduped by id) so two phones never clobber each other.

### 4.5 Privacy & security

- **Local-first:** your fridge lives in the browser; nothing leaves the device
  unless you choose a networked feature.
- **GDPR:** in-app **data export** (JSON) and **account + data deletion** that
  wipes the server account, sessions, synced blob and this device's community
  rows.
- **Auth:** PBKDF2-SHA256 password hashing (100k iterations — the Workers cap),
  opaque 256-bit session tokens, and **login rate-limiting** (5 tries / 15 min).
- **Sharing:** household codes are 8 chars from a 30-symbol alphabet (~6.6×10¹¹
  combinations), generated with a CSPRNG.

## 5. Implementation

- **Stack:** vanilla HTML/CSS/JS PWA; Cloudflare Workers + D1; Web Push (VAPID);
  Web Crypto for hashing/tokens.
- **Internationalisation:** 33 languages via per-feature translation tables merged
  into one lookup with English fallback; full RTL support (Arabic, Hebrew).
- **Testing & CI:** four suites run on every push — text guard-rails, a 300+‑check
  headless Playwright smoke test that exercises the app fully offline, and Node
  tests for the worker's auth, push/cron and household-merge logic against an
  in-memory D1 stub.

## 6. Evaluation (plan & results)

The core claim — *Kulpio reduces household food waste* — is evaluated with a small
user study. Method (to be run and filled in):

- **Participants:** N household users over a 2-week period.
- **Metric:** items wasted per week (self-reported) and money-at-risk vs.
  money-saved, both of which the app already tracks in its history log.
- **Design:** baseline week without active use vs. a week using Kulpio, plus a
  short usability survey (SUS) and qualitative feedback.
- **Instrumentation:** the app's exportable history log (date, action, item,
  price) provides the raw data; the Profile "impact" summary aggregates it.

> _Results table to be completed after the study: waste reduction %, money saved,
> SUS score, retention._

Two complementary pieces support this, kept **strictly separate**:

- **Real evidence** — the micro-study protocol in
  [`STUDY_PROTOCOL.md`](STUDY_PROTOCOL.md) (within-subject, baseline vs.
  intervention week, N = 3–15, measured via the app's CSV export). This produces
  the measured numbers for the table above.
- **Projected potential** — a transparent Monte-Carlo model in
  [`IMPACT_MODEL.md`](IMPACT_MODEL.md) (run `node tools/impact_sim.mjs`). It is
  **explicitly a projection, not observed data**: under a mid-range assumption of
  30 % reminder effectiveness it projects ≈ 30 % fewer wasted items and
  ≈ €10–11 saved / household / month, with a full sensitivity sweep. Present it
  only as "projected impact," never as study results.

## 7. Limitations (honest)

- **AI reliability** depends on the backend: without an Anthropic key it falls
  back to a smaller free model, so label/receipt reading is less accurate.
- **Expiry-estimate accuracy** for the offline table has not yet been formally
  validated against measured shelf lives.
- **No email verification** yet (requires an email provider); accounts are usable
  but unverified.
- **iOS PWA constraints** — web push and install behaviour are more limited on
  iOS Safari than on Android.
- **Sync conflicts** are last-write-wins for the fridge/list (not field-level
  merged), which is fine for typical one-device-at-a-time use.

## 8. Future work

- Validate and calibrate the shelf-life table against reference data.
- Add email verification once an email provider is configured.
- Field-level merge for offline multi-device edits.
- On-device barcode → nutrition without a network round-trip.
- A shareable monthly "impact" report for the study and for users.

## 9. Licensing & sustainability

Kulpio is **dual-licensed**: free under the GNU AGPL v3.0 for open use, and
available under a **paid commercial licence** for closed-source/commercial use
(see `COMMERCIAL-LICENSE.md`). This keeps the project open while providing a
sustainable revenue path.

## References

1. FAO — *Global Food Losses and Food Waste* (food-waste scale).
2. UNEP — *Food Waste Index Report* (household share of food waste).
3. WRAP — household food-waste reduction research.
4. Open Food Facts — open product/barcode database (used for product data).
5. TheMealDB — open recipe database.
6. Cloudflare — Workers, D1, Workers AI documentation.
7. W3C — Progressive Web Apps, Service Workers, Web Push, Web Crypto specs.

*(Add exact citations/URLs and the study results before submission.)*
