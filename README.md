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

## Development

```bash
npm install                                   # test dependencies only
npx playwright install chromium               # once
npm test                                      # 43-check headless smoke test
npx wrangler dev                              # run app + API locally
```

Tests run on every push via GitHub Actions (`.github/workflows/test.yml`).

## Layout

| Path | What it is |
|---|---|
| `kulpio_app.html` | The entire app: markup, styles, logic, 33 translation tables |
| `index.html` | Redirect to the app |
| `service-worker.js`, `manifest.webmanifest` | Offline cache + PWA install |
| `ai-proxy/worker.js` | Cloudflare Worker: expiry/label/nutrition via Claude, web image search |
| `wrangler.toml` + `.assetsignore` | All-in-one Cloudflare entry point (app as static assets + API) |
| `tests/smoke.js` | Headless Playwright smoke test (runs fully offline) |
