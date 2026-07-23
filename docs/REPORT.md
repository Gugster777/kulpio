# Kulpio — Project Report

**A privacy-first Progressive Web App for reducing household food waste.**

| | |
|---|---|
| **Author** | Daniil Bejenari |
| **Category** | Software / Applied IT project |
| **Year** | 2026 |
| **Repository** | https://github.com/Gugster777/kulpio |
| **Licence** | Dual: GNU AGPL v3.0 / paid commercial (see `COMMERCIAL-LICENSE.md`) |

---

## Executive summary

About a third of all food produced is wasted, and households are one of the
largest contributors — mostly because food is bought, forgotten, and thrown away
after it expires. **Kulpio** attacks this where it happens: in the kitchen. It is
a Progressive Web App that tracks what's in your fridge, tells you what will
expire first, and helps you cook it before it's wasted. It installs to the home
screen, runs **offline from a single static HTML file**, works in **33 languages**,
and makes adding food nearly effortless (barcode scan, photo/label reading,
receipt scan, or a pasted list). A single Cloudflare Worker backed by a SQLite
(D1) database provides optional accounts, cross-device sync, a shared household
fridge with chat, and community data — all while keeping personal data on the
device by default and offering full GDPR export and deletion.

This report covers the problem, existing solutions, the design and methodology,
the system architecture, how impact is evaluated (a real micro-study plus a
clearly-labeled projection model), the current limitations, and the licensing /
sustainability model.

---

## 1. Introduction & problem

- **Scale.** The FAO estimates ~1/3 of food produced globally is lost or wasted;
  the UNEP Food Waste Index attributes a large share to households.
- **Root cause at home.** The dominant household cause is *forgetting* — items
  bought and never used in time. This is an **information and attention problem**,
  not a preservation problem.
- **Consequences.** Wasted food is wasted money and needless emissions. A tool
  that surfaces "what's about to expire" and "what to cook with it" reduces both.

**Objective.** Build an app that (a) makes tracking food nearly effortless, (b)
tells the user what to use *first*, and (c) runs on any phone, offline, in the
user's language, without harvesting personal data.

## 2. Related work

| Product | Approach | Gap Kulpio addresses |
|---|---|---|
| NoWaste, Fridgely, Kitche | Manual/receipt inventory + expiry reminders | Native-app only; limited AI label reading; little household sharing; few languages |
| Too Good To Go | Marketplace for surplus **retail** food | Solves retail surplus, not the food already in *your* fridge |
| Whisk / Samsung Food | Recipe + pantry, account-centric | Cloud-first, account required; not offline-first |
| Supermarket loyalty apps | Purchase history | No expiry tracking or waste-reduction loop |

**Differentiation.** Kulpio is an *offline-first single-file PWA* that combines
(1) multiple low-friction inputs including **AI label/receipt reading**, (2)
trustworthy expiry handling (printed dates always beat estimates), (3) a
**waste-reduction loop** (used / wasted / froze, money saved), (4) a
**shared-fridge social layer** (members, activity feed, chat) with server-side
merge, and (5) a **privacy-first** stance (local-first, GDPR export + deletion),
all in 33 languages with no app-store install required.

## 3. The solution

- **Track** — fridge / freezer / pantry; live freshness colouring; a "week ahead"
  strip of what expires when.
- **Add with minimal effort** — barcode scanner, photo/label reading, receipt
  scan → editable review, or paste a whole list.
- **Expiry** — printed best-before dates take priority; otherwise an estimate is
  produced (see §4.1).
- **Close the loop** — mark items *Used / Wasted / Froze*; track money saved vs.
  money at risk and a waste-free streak.
- **Cook first what's going off** — recipe suggestions from current ingredients,
  with per-serving nutrition estimates.
- **Share** — one 6–8-character code links a household's fridge + shopping list,
  with members, an activity feed and a chat.
- **Accounts (optional)** — email/OAuth sign-in syncs data across devices.
- **Engagement** — achievements, XP levels with tier titles, a monthly recap,
  and an "impact" screen.

## 4. Methodology

### 4.1 Expiry estimation

Kulpio treats the *printed* date as ground truth and only estimates when none is
available:

1. **Printed date** — read via the label scanner (OCR + model) or typed — always
   wins.
2. **Offline shelf-life table** — a built-in per-food estimate keyed by the item's
   canonical ingredient, adjusted for storage (freezer extends ~90 days; opened
   shortens).
3. **AI estimate** — refines from the product name when a backend is available.

The freshness meter is the fraction of the item's estimated shelf life still
ahead — an approximation by design, clearly framed as such.

### 4.2 AI pipeline

A single Cloudflare Worker exposes the AI/API and degrades gracefully:
**Anthropic Claude** (if a key is set) → **Cloudflare Workers AI (Llama)** (free
default) → a clean JSON error. The app never blocks on AI.

### 4.3 Architecture (summary; full detail in `ARCHITECTURE.md`)

- **Client:** one static `kulpio_app.html` (~12k lines: markup + CSS + JS + 33
  translation tables). No build step, no framework.
- **Offline:** a service worker precaches the app; network-first for HTML so new
  deploys always win.
- **Backend:** one Worker serves the static app *and* the API on one origin,
  backed by Cloudflare **D1** (SQLite): accounts, per-user sync, households,
  community scans/prices, push subscriptions, login-attempt limiting.

### 4.4 Data sync & sharing

- **Account sync** — a per-user JSON blob follows the account across devices
  (pushed on change, pulled on foreground).
- **Household sync** — fridge + shopping list are whole-state last-write-wins, but
  **members, activity and chat are merged server-side** (deduped by id) so
  concurrent devices never clobber each other.

### 4.5 Privacy & security

- **Local-first:** the fridge lives in the browser; nothing leaves the device
  unless the user chooses a networked feature.
- **GDPR:** in-app **data export** (JSON) and **account + data deletion** that
  wipes the server account, sessions, synced blob and this device's community
  rows.
- **Auth:** PBKDF2-SHA256 (100k iterations), opaque 256-bit session tokens, and
  **login rate-limiting** (5 tries / 15 min).
- **Sharing:** household codes are 8 characters from a 30-symbol alphabet
  (~6.6×10¹¹ combinations), generated with a CSPRNG.

## 5. Implementation

- **Stack:** vanilla HTML/CSS/JS PWA; Cloudflare Workers + D1; Web Push (VAPID);
  Web Crypto.
- **Internationalisation:** 33 languages via per-feature tables merged into one
  lookup with English fallback; full RTL support.
- **Testing & CI:** four suites run on every push — text guard-rails, a 300+‑check
  headless Playwright smoke test that runs the app fully offline, and Node tests
  for the worker's auth, push/cron and household-merge logic against an in-memory
  D1 stub.

## 6. Evaluation

The core claim — *Kulpio reduces household food waste* — is supported two ways,
kept **strictly separate**:

### 6.1 Real evidence (micro-study) — `STUDY_PROTOCOL.md`

A within-subject pilot: each participant records a **baseline week** (diary only)
and an **intervention week** (using Kulpio's reminders), N = 3–15, measured via
the app's **CSV export** (`date, action, item, price`). Primary outcome: change in
waste rate. *Results table to be completed after running the study.*

| Metric | Baseline | Intervention | Change |
|---|---|---|---|
| Waste rate (%) | … | … | … |
| Items wasted / week | … | … | … |
| Money wasted / week | … | … | … |
| Mean SUS (0–100) | — | — | … |

### 6.2 Projected potential (model) — `IMPACT_MODEL.md`

A transparent, reproducible Monte-Carlo model (`node tools/impact_sim.mjs`)
translating one stated assumption — reminder effectiveness — into projected
outcomes. **This is a projection, not measured data.**

| Reminder effectiveness | Waste reduction | € saved / household / month |
|---|---|---|
| 15 % | 15 % | €5.33 |
| **30 % (mid-range)** | **30 %** | **€10.71** (≈ €128 / year) |
| 50 % | 50 % | €17.81 |

Baseline in the model: ~18 % of items wasted (≈ €35.69 / month at risk).

## 7. Limitations (honest)

- **AI reliability** depends on the backend; without an Anthropic key it falls
  back to a smaller free model, so label/receipt reading is less accurate.
- **Expiry-estimate accuracy** for the offline table is not yet formally
  validated.
- **No email verification** yet (needs an email provider).
- **iOS PWA constraints** — push/install are more limited on iOS Safari.
- **Sync** is last-write-wins for the fridge/list (not field-level merged).
- The **projection model** is driven by its effectiveness assumption; only the
  study measures the real effect.

## 8. Future work

- Validate and calibrate the shelf-life table against reference data.
- Add email verification once an email provider is configured.
- Field-level merge for offline multi-device edits.
- A shareable monthly "impact" report.

## 9. Licensing & sustainability

Kulpio is **dual-licensed**: free under the GNU AGPL v3.0 for open use, and a
**paid commercial licence** for closed-source/commercial use (per-product,
tiered — see `COMMERCIAL-LICENSE.md`). This keeps the project open while
providing a sustainable revenue path.

## 10. Conclusion

Kulpio turns a hard behavioural problem — forgetting food — into a low-effort,
private, offline-first app that any phone can run in any of 33 languages. The
engineering is complete and tested; the evaluation combines a real pilot with a
transparent projection; and the licensing model makes it sustainable. The next
step is to run the pilot and record measured results.

## References

1. FAO — *Global Food Losses and Food Waste*.
2. UNEP — *Food Waste Index Report* (household share).
3. WRAP — household food-waste reduction research.
4. Open Food Facts — open product/barcode database.
5. TheMealDB — open recipe database.
6. Cloudflare — Workers, D1, Workers AI documentation.
7. W3C — PWA, Service Worker, Web Push, Web Crypto specifications.

*(Add exact citation URLs and the measured study results before submission.)*
