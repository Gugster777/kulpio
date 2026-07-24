<div align="center">

# 🍐 Kulpio

**Waste less food · Save money · In any language**

A privacy-first Progressive Web App that tracks what's in your fridge, warns you
what expires first, and helps you cook it in time — **offline, on any phone, in
33 languages.**

`one static HTML file` · `no build step` · `installs to the home screen` · `AGPL-3.0 / commercial`

</div>

---

## Try it in 10 seconds

- **Live app:** open the deployed URL on your phone and tap *Add to Home Screen*.
- **Instant demo:** add `?demo=1` to the URL for a fully populated fridge (16 items,
  months of history, achievements) — perfect for a first look or a presentation.
  Exit any time from **Profile → Exit demo**; your real data is restored untouched.

## What it does

| | |
|---|---|
| 📷 **Effortless input** | Scan a barcode, read a label or receipt with AI, or paste a list — no typing marathon. |
| ⏳ **Trustworthy dates** | Printed best-before dates always win; a built-in offline shelf-life table fills the gaps. |
| 🍳 **Use it in time** | Live freshness colours, a week-ahead strip, and recipes built from what's going off. |
| 🧊 **Storage sections** | Fridge, freezer and pantry, each with its own freshness. |
| 👥 **Shared fridge** | One code links a household — synced items, activity feed and chat. |
| 🔔 **Reminders** | Optional daily web-push when something's about to expire. |
| 🏆 **Motivation** | Achievements, XP levels, a monthly recap and your money saved. |
| 🌍 **33 languages** | Full right-to-left support; nothing leaves your device unless you opt in. |

## How it's built

Kulpio is deliberately **one static HTML file** (`kulpio_app.html`) — markup, styles,
logic and all 33 translation tables — with **no build step, no framework, no bundler.**
That's what lets it install and run fully offline from static hosting.

- **Client:** the single file + a service worker that precaches it → works with no network.
- **Backend (optional):** one **Cloudflare Worker** (`ai-proxy/`) serves the app *and* the
  AI/API on the same origin, backed by **D1 (SQLite)** for accounts, sync, households and
  community signals, with **VAPID web-push** for reminders.
- Every networked feature **degrades gracefully** — offline, you get the built-in
  estimates instead of the AI ones, and nothing ever blocks.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.

## Deploy (recommended — everything on one URL)

```bash
npx wrangler deploy                          # publishes https://kulpio.<you>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY    # optional — enables the smarter AI features
```

Because the app and API share one origin, there's no "AI setup" step — the app finds
its backend automatically. No key? Everything still works offline-first.

**Static-only alternative:** host the repo on any static host (GitHub Pages works as-is),
then deploy just the API from [`ai-proxy/`](ai-proxy/) and paste its URL into the app via
menu (☰) → **AI setup**.

## Android app

Kulpio is Play-Store-ready as a thin **TWA** (Trusted Web Activity) — a packaging step,
not a rewrite. The manifest, `twa-manifest.json` and worker-served `assetlinks.json` are
already wired. Full walkthrough: [`ANDROID.md`](ANDROID.md).

## Develop & test

```bash
npm install                        # test dependencies only
npx playwright install chromium    # once
npm test                           # structure guard-rails + 338-check smoke suite + worker tests
npx wrangler dev                   # run app + API locally
```

CI runs `npm test` on every push (`.github/workflows`). The smoke suite drives the whole
app headless and **fully offline**.

> **Editing note:** it's one ~1.4 MB file. Search by the section-comment markers
> (`// ─── NAME ───`), make small targeted edits, and bump `CACHE_NAME` in
> `service-worker.js` on any app change so installed clients update. See [`CLAUDE.md`](CLAUDE.md).

## Repository layout

Core app files live at the **root on purpose** — the offline PWA installs from static
hosting and the service worker precaches them by relative path, so they can't be foldered away.

| Path | What it is |
|---|---|
| `kulpio_app.html` | The entire app — markup, styles, logic, 33 translation tables |
| `index.html` | Redirect into the app |
| `service-worker.js` · `manifest.webmanifest` | Offline cache + PWA install |
| `kulpio-icon*.png/.svg` · `kulpio-sc-*.png` | App icons + home-screen shortcut icons |
| `ai-proxy/worker.js` | Cloudflare Worker: AI expiry/label/nutrition, sync, households, push |
| `wrangler.jsonc` · `.assetsignore` | All-in-one Cloudflare entry point (static app + API) |
| `twa-manifest.json` · `ANDROID.md` | Android (TWA) packaging config + guide |
| `tests/` | `structure.test.mjs`, `smoke.js`, and the worker suites |
| `docs/` | Full report, architecture, impact model, competition decks & the science board |

## Documentation

- [`docs/PROJECT.md`](docs/PROJECT.md) — full report: problem, methodology, evaluation plan, references
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture with diagrams
- [`docs/IMPACT_MODEL.md`](docs/IMPACT_MODEL.md) — how the projected savings are modelled (transparent, not a study)

## License

Kulpio is **dual-licensed**:

1. **[GNU AGPL v3.0](LICENSE)** — free to use, modify and self-host **only** if you comply
   with the AGPL (which requires publishing your complete source, including when run as a
   network service).
2. **A paid commercial licence** — required for any closed-source, proprietary or commercial
   use. See [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md).

See also [`NOTICE`](NOTICE). Copyright © 2026 Daniil Bejenari.

<div align="center">
<sub>Built by Daniil Bejenari · T.L. Orizont, Ceadîr-Lunga · for firSTep × Infomatrix 2026</sub>
</div>
