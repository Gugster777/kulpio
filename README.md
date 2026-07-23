# 🍐 Kulpio

A multilingual (33 languages) install-to-home-screen PWA that helps you waste
less food: it tracks what's in your fridge, estimates expiry dates (offline
table + Claude), shows real pack photos, turns your ingredients into recipes
with БЖУ/nutrition estimates, and counts the money you save.

The whole app is **one static HTML file** (`kulpio_app.html`) — no build step,
no framework, no database.

## Deploy to Cloudflare (recommended — everything on one URL)

The repo root is a Cloudflare Workers entry point that serves the app *and*
its AI API together:

```bash
npx wrangler deploy                          # publishes https://kulpio.<you>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY    # paste your key from console.anthropic.com
```

That's it. Open the URL on your phone, install to the home screen, done.
Because the API lives on the same origin, the app finds it automatically —
no "AI setup" step. The AI powers smarter expiry estimates, reading a
best-before date off a photo, per-serving recipe nutrition, and web image
search for product photos.

No `ANTHROPIC_API_KEY`? Everything still works offline-first — you just get
the built-in estimates instead of Claude's.

## Alternative: static hosting + separate API

Host the repo on any static host (GitHub Pages works as-is), then deploy only
the API from `ai-proxy/` and paste its URL into the app: menu (☰) → **AI
setup**. See [`ai-proxy/README.md`](ai-proxy/README.md).

## Documentation

- [`docs/PROJECT.md`](docs/PROJECT.md) — the full project report: problem, related
  work, methodology (how the expiry estimation and AI pipeline work), evaluation
  plan, limitations and references.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture with diagrams.

## Development

```bash
npm install                                   # test dependencies only
npx playwright install chromium               # once
npm test                                      # structure + smoke (300+ checks) + worker suites
npx wrangler dev                              # run app + API locally
```

Tests run on every push via GitHub Actions (`.github/workflows`). The suites are
`tests/structure.test.mjs` (guard-rails), `tests/smoke.js` (headless Playwright,
runs the app fully offline), and `tests/worker-*.test.mjs` (auth, push, household
merge, all against an in-memory D1 stub).

## Layout

| Path | What it is |
|---|---|
| `kulpio_app.html` | The entire app: markup, styles, logic, 33 translation tables |
| `index.html` | Redirect to the app |
| `service-worker.js`, `manifest.webmanifest` | Offline cache + PWA install |
| `ai-proxy/worker.js` | Cloudflare Worker: expiry/label/nutrition via Claude, web image search |
| `wrangler.jsonc` + `.assetsignore` | All-in-one Cloudflare entry point (app as static assets + API) |
| `tests/smoke.js` | Headless Playwright smoke test (runs fully offline) |

## License

Kulpio is **dual-licensed**:

1. **[GNU AGPL v3.0](LICENSE)** — free to use, modify and self-host **only** if
   you comply with the AGPL (which requires publishing your complete source,
   including when run as a network service).
2. **A paid commercial licence** — required for any closed-source, proprietary
   or commercial use of Kulpio or its features. See
   [`COMMERCIAL-LICENSE.md`](COMMERCIAL-LICENSE.md). Unlicensed commercial use
   owes licensing fees.

See also `NOTICE`. Copyright © 2026 Daniil Bejenari.
