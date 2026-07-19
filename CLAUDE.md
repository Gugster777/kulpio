# Kulpio — working notes for contributors (and Claude)

A food-freshness tracker PWA in **33 languages**. Track your fridge, get
told when things expire, cook what's going before it's wasted, cut spend.

## The one rule: it's a single static HTML file

`kulpio_app.html` is the entire app — markup, styles, and all logic — in one
file (~12k lines). **There is no build step.** This is deliberate: the app
installs and runs offline from static hosting, and the whole thing is one
file to reason about at runtime. Don't add a bundler, framework, or
`<script src>` split without a very good reason — it breaks the deploy model
and the offline-first service worker.

Practical consequences when editing:
- Search by the section-comment markers (`// ─── NAME ───` / `/* ── NAME ── */`),
  not line numbers — line numbers drift constantly.
- Make small, targeted `Edit`s. A find/replace across this file is dangerous.
- **Bump `CACHE_NAME` in `service-worker.js`** (`kulpio-vNNN`) on any change to
  the app, SW, manifest, or icons, or installed clients keep the old copy.

## Where things live (section markers in kulpio_app.html)

| Area | Marker(s) |
|---|---|
| App shell / theme tokens | `APP SHELL`, theme `:root` blocks near the top |
| Persistent state | `STATE` (the `state` object + `saveState`) |
| Translations | dozens of `const LNN = {…}` tables, each merged by `for (const lng in LNN) …`. `l('key')` looks a key up in the current language, falling back to `en`. |
| Fridge freshness | `LIVE FRESHNESS`, `SHELF-LIFE ESTIMATOR` |
| Expiry estimate + scan-date | `AI ESTIMATOR`, the `scanDateFromPack` / `readLabelWithAI` pair (printed dates beat estimates) |
| Product add/edit | `PRODUCT MODAL`, `PRODUCT CARDS` |
| Receipt scan → review | `RECEIPT REVIEW` (`readReceiptWithAI` opens an editable confirm sheet) |
| Storage sections | fridge/freezer/pantry via `productLoc`/`setProductLoc` |
| Recipes | `IN-APP RECIPE …`, `RECIPES HELPERS` |
| Scanner | `SCAN HUB`, `BARCODE SCANNER`, `SCANNER` |
| Notifications | `NOTIFICATIONS` (`maybeNotifyExpiring`), `expiryNotifCopy`, push in `enablePush`/`cachePushCopy` |
| Shared household | the `house*` functions (one code syncs shop + fridge) |
| Mascot (the pear) | `assistant-icon` SVG in markup + the many `pear*` animation fns |
| Overlays orchestration | `anyOverlayOpen` / `closeAllOverlays` / `SYSTEM BACK BUTTON` |

## The worker (`ai-proxy/worker.js`)

One Cloudflare Worker serves the app (static assets) **and** the AI/API on one
URL — see `wrangler.jsonc`. Brains in order: Anthropic Claude if
`ANTHROPIC_API_KEY` is set, else free Workers AI (Llama), else a clean error.
Endpoints are dispatched by the POST body's key (`name`, `image`, `nutrition`,
`brands`, `chef`, `verdict`, `imageSearch`, `receipt`, `scanLog`/`rateLog`/…
D1-backed community features, `houseSet`/`houseGet`, `pushKey`/`pushSet`/…).
A daily `scheduled()` cron sends VAPID web-push. Every path degrades to a JSON
error when its binding/secret is missing — never throws.

## Conventions

- **New user-facing text** goes in a new `const LNN = {…}` table with **all 33
  languages** and its own merge loop. Never reuse an existing `LNN` number
  (the structure test fails if you do). Language keys are:
  `en ru ro de fr es it pt pl tr ar zh ja ko hi uk nl sv no da fi cs sk hu bg
  sr hr el he th id ms vi`.
- **Adding an overlay/modal**: register its id in `anyOverlayOpen`, close it in
  `closeAllOverlays`, and call `ensureOverlayHistory()` when it opens (so the
  Android Back button closes it instead of leaving the app).
- **RTL** (`ar`, `he`) is handled by `[dir=rtl]` CSS — use logical properties
  (`start`/`end`) for new UI.

## Tests & deploy

```bash
npm install
npx playwright install chromium        # once
npm test                               # structure + smoke (headless) + worker
npx wrangler deploy                    # app + API to Cloudflare (or the Git build)
```

`npm test` runs three suites, fastest-first:
1. `tests/structure.test.mjs` — text guard-rails (no dup/orphan translation
   tables, no conflict markers, cache name is versioned). Instant, no browser.
2. `tests/smoke.js` — the big headless Playwright suite (300+ checks), runs
   the app fully offline; set `CHROME_PATH` to point at a browser binary.
3. `tests/worker-push.test.mjs` — drives the worker's push endpoints + cron in
   Node with a stub D1 and a generated VAPID key pair.

CI runs `npm test` on every push/PR (`.github/workflows`).
