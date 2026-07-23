# Kulpio — Infomatrix Project Documentation

**Category:** Programming
**Author:** Daniil Bejenari — T.L. Orizont, Ceadîr-Lunga
**Repository:** https://github.com/Gugster777/kulpio
**Live app:** deployable to Cloudflare with one command (`npx wrangler deploy`)

---

## 1. Project description

**Kulpio** is a privacy-first Progressive Web App that helps households waste
less food. It tracks what's in your fridge, freezer and pantry, tells you what
expires first, and helps you cook it before it's wasted — offline, on any
phone, in **33 languages**.

The problem it attacks: roughly a third of all food produced is lost or wasted
(FAO), and households are among the largest contributors. The dominant cause at
home is *forgetting* — food is bought, pushed to the back of a shelf, and
thrown away after it expires. That is an information and attention problem,
which is exactly what software can fix.

The project aligns with the UN Sustainable Development Goals: **SDG 12**
(Responsible Consumption & Production — primary, Target 12.3: halve global
food waste by 2030), **SDG 2** (Zero Hunger) and **SDG 13** (Climate Action).

### Core features

- **Effortless input** — barcode scanner, AI label reading, receipt scan with
  an editable review step, or paste a whole shopping list.
- **Trustworthy expiry** — printed best-before dates always beat estimates;
  otherwise an offline shelf-life table estimates, refined by AI when online.
- **The waste-reduction loop** — mark items Used / Wasted / Froze; the app
  tracks money saved vs. money at risk and a waste-free streak.
- **Recipes** — cook-first suggestions from what's going off, with
  per-serving nutrition estimates.
- **Shared household** — one code links a family's fridge and shopping list,
  with a members list, an activity feed and a chat.
- **Accounts (optional)** — email/password or Google sign-in syncs data
  across devices; full GDPR export and deletion built in.
- **Motivation layer** — an expressive pear mascot, achievements, XP levels,
  a monthly recap and an impact screen.

## 2. Software / hardware specifications

### Client (the app)

| | |
|---|---|
| Form | Single static file — `kulpio_app.html` (~1.3 MB: markup + CSS + JS + 33 translation tables) |
| Framework | None — vanilla HTML/CSS/JavaScript, no build step, no bundler |
| Offline | Service worker precaches the app; runs fully offline from the home screen |
| Storage | `localStorage` (local-first — data stays on the device by default) |
| APIs used | Camera (barcode/label/receipt), Web Push, Web Crypto, Vibration, Web Share |
| I18n | 33 languages via per-feature translation tables merged into one lookup with English fallback; full RTL (Arabic, Hebrew) |

### Backend (one worker)

| | |
|---|---|
| Runtime | A single Cloudflare Worker serves the static app **and** the JSON API on one origin |
| Database | Cloudflare D1 (SQLite): users, sessions, per-user sync blobs, households, community scans/prices, push subscriptions, login-attempt limiting |
| AI | Graceful ladder: best cloud AI model (if a key is configured) → Cloudflare Workers AI (Llama, free) → clean JSON error. The app never blocks on AI. |
| Push | Web Push with VAPID; a daily cron wakes only devices whose soonest item is about to expire — the push itself carries no user data |
| Security | PBKDF2-SHA256 password hashing (100k iterations), opaque 256-bit session tokens, login rate-limiting (5 tries / 15 min), CSPRNG household codes (~6.6×10¹¹ combinations) |

### Hardware

No special hardware — any phone or computer with a modern browser. A camera
is optional (used for scanning); everything can also be typed.

### Testing

Four suites run in CI on every push:
1. `tests/structure.test.mjs` — text guard-rails (translation-table
   integrity, no conflict markers, versioned cache name).
2. `tests/smoke.js` — 300+ headless Playwright checks that exercise the app
   **fully offline**.
3. `tests/worker-push.test.mjs` — the worker's push + cron logic against an
   in-memory D1 stub and a generated VAPID key pair.
4. `tests/worker-auth.test.mjs` / `worker-house.test.mjs` — auth, sync and
   household-merge logic.

## 3. People involved

| Role | Person |
|---|---|
| Author / project lead — design, development, testing, documentation | **Daniil Bejenari**, T.L. Orizont, Ceadîr-Lunga |

Open data and services used: Open Food Facts (product/barcode data),
TheMealDB (recipe data), Cloudflare (hosting, D1, Workers AI).

## 4. Timeline (from the project's real commit history — 240+ commits)

| Period (2026) | Milestone |
|---|---|
| **Jun 30** | First working core: fridge list, live freshness, expiry estimates, settings, service-worker offline shell |
| **Jul 1–2** | The food loop (Used / Froze / To buy); the pear mascot replaces a generic assistant; theme system; waste tracking; notifications; backup/restore |
| **Jul 3–8** | Multi-add + duplicate merge; quantities; monthly history; CI smoke tests; product photos (Open Food Facts + own camera); brand suggestions; swipe actions; **Cloudflare entry point — one deploy serves app + API** |
| **Jul 9–11** | Theme/contrast hardening; **AI goes live** (free Workers AI with an optional premium model); all 33 languages made natural (no calques, qualifiers kept) |
| **Jul 12–14** | Week-ahead strip; achievements; money-at-risk; calmer Home redesign ("the pear gets a porch, the fridge gets a pulse") |
| **Jul 15–16** | Scanner rebuilt to feel like a real scanner app; teach-it-once unknown barcodes; torch; category shelf |
| **Jul 17–19** | Receipt scanner (one photo → whole shopping); **shared household** (list, then the whole fridge); web push with smart copy; printed-date scanning; Kulpio Wrapped |
| **Jul 20–22** | Discover tab; profile rework; responsive hardening; shared-fridge activity feed + chat; account sync foreground pull |
| **Jul 23** | Accounts hardening (rate limiting, GDPR export/delete); dual licensing; docs, impact model + study protocol; competition decks; dashboard rework (freshness rings → live countdown); auth & nav cleanup |

## 5. Early plans and iterations

The project deliberately grew in small, shippable iterations (the
service-worker cache version is at **v205** — every one of those was a real
deployed step). The path was not straight; several ideas were built, tested
and **discarded**:

- A **smart action bar** of adaptive shortcut chips — built, then removed the
  same day: it competed with the content instead of helping.
- A **voice assistant** and later a voice-add feature — removed: cool demo,
  poor everyday value.
- A **"dress the pear" wardrobe** — cut to keep the mascot tasteful.
- A **mod menu** of privileged features — abandoned on principle.
- The original **blue "assistant bird" theme** — replaced by the pear and an
  orchard palette that now drives the whole design system.

Each removal is in the git history; the lesson each taught is in
[`JOURNAL.md`](JOURNAL.md).

## 6. Problems faced and how they were solved

| Problem | Solution |
|---|---|
| **Must work with no network** (school corridors, basements, roaming) | Single-file PWA + service-worker precache; the smoke suite runs the whole app with network access blocked, so offline is tested, not assumed |
| **AI expiry estimates felt unreliable** and users can't trust a guess | Inverted the hierarchy: a **printed date always wins**; the offline shelf-life table is the fallback; AI only refines. The label scanner reads best-before dates straight into the form |
| **Typing every product was tedious** — nobody keeps a diary forever | Four input paths: barcode scan, AI label photo, receipt photo → editable review, paste-a-list. "Teach it once": an unknown barcode learns from the user and answers offline next time |
| **Two phones edited one household and clobbered each other** | Server-side merge: fridge + shopping stay whole-state last-write-wins, but members, activity and chat merge by id, so concurrent devices never lose messages |
| **A push service could see users' food** | Pushes are **empty wake-ups**; the app pre-writes localized notification copy into its own cache and composes the alert on the device |
| **33 languages read like machine calques** («Stoc de pui») | Batched AI translation with qualifier-keeping rules and native idiom checks; a structure test guards every table against drift |
| **Passwords + shared codes needed real security** | PBKDF2 (100k iterations), opaque sessions, login rate-limiting (5/15 min), 8-char CSPRNG household codes; GDPR export + true deletion |
| **The single 12k-line file risked rotting** | Section-comment markers, guard-rail structure tests, 300+ smoke checks in CI on every push, and a versioned cache (`kulpio-vNNN`) so clients always refresh cleanly |

## 7. Results & evaluation

- The engineering is complete and tested (4 suites, CI on every push).
- **Projected impact** (clearly labeled a model, not a study): a seeded
  Monte-Carlo simulation (`tools/impact_sim.mjs`) projects **≈ €10–11 saved
  per household per month (~€128/year)** and ~30 % fewer wasted items at a
  mid-range reminder-effectiveness assumption — see
  [`IMPACT_MODEL.md`](IMPACT_MODEL.md).
- **Real evidence** comes from a within-subject micro-study (baseline week vs.
  Kulpio week, N = 3–15, measured via the app's built-in CSV export) — see
  [`STUDY_PROTOCOL.md`](STUDY_PROTOCOL.md). The two are kept strictly
  separate.

## 8. Licensing

Dual-licensed: free under the **GNU AGPL v3** for open use, with a commercial
licence available. The project stays open for anyone to study and build on.

---

*Full technical detail: [`PROJECT.md`](PROJECT.md) ·
[`ARCHITECTURE.md`](ARCHITECTURE.md) · development log: [`JOURNAL.md`](JOURNAL.md).*
