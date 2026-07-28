<div align="center">

# Kulpio

### Waste less food. Save money. Cook what you already have.

Privacy-first food freshness tracking for phones and desktops.
Works offline, installs as a PWA, and supports 33 languages.

[Live demo](https://kulpio.daneabejenari0103.workers.dev/kulpio_app?demo=1)
· [Open app](https://kulpio.daneabejenari0103.workers.dev/kulpio_app)
· [Report an issue](https://github.com/Gugster777/kulpio/issues)

</div>

---

## Why Kulpio?

Most food waste starts with a forgotten item. Kulpio turns the fridge into a
simple daily plan: see what expires first, get a useful recipe, and save the
money that would otherwise be thrown away.

## Highlights

| Feature | What it gives you |
| --- | --- |
| **Barcode scanner** | Product facts, nutrition, ingredients, allergens and photos from Open Food Facts. |
| **Freshness tracking** | Printed dates take priority; offline shelf-life estimates fill the gaps. |
| **Cook-first recipes** | Suggestions ranked around the food that needs using soonest. |
| **Fridge, freezer and pantry** | Keep every storage place in one clear view. |
| **Receipt and label tools** | Add several products quickly, or read a best-before date from packaging. |
| **Shared fridge** | Link a household with one code, including activity and chat. |
| **Savings and impact** | See food saved, money saved, waste history and monthly progress. |
| **Offline-first PWA** | The core app keeps working without a connection and can be installed to the home screen. |
| **33 languages** | Localized UI with right-to-left support. |

## Try the presentation demo

Open the [instant demo](https://kulpio.daneabejenari0103.workers.dev/kulpio_app?demo=1)
to start with a realistic fridge: products, expiry warnings, history,
achievements, recipes and discount cards are already prepared.

The demo is isolated from real data. Use **Profile -> Exit demo** to leave it;
your original fridge is restored untouched.

## Open Food Facts

Kulpio uses the official Open Food Facts API for barcode product data. Requests
identify the app with:

```text
Kulpio/1.0 (kulpio.support@gmail.com)
```

Reads are proxied through the Cloudflare Worker so the browser does not need
OFF credentials. Optional authenticated contribution support uses Worker-only
secrets (`OFF_USER_ID` and `OFF_PASSWORD`); credentials are never stored in
the repository or shipped to users. Any contribution must come directly from
the product packaging and follow the [OFF terms of use](https://world.openfoodfacts.org/terms-of-use).

## Architecture

Kulpio is deliberately small at runtime:

```text
src/app/  ->  npm run build  ->  kulpio_app.html + service-worker.js
                                      |
                                      v
                         Cloudflare Worker + D1 + Workers AI
```

- `src/app/` contains the editable client source.
- `kulpio_app.html` is the generated single-file app served to users.
- `ai-proxy/worker.js` serves the app and optional API on one origin.
- D1 stores optional accounts, sync data, household activity and community signals.
- Offline mode falls back to local data and built-in estimates instead of blocking.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the detailed design.

## Run locally

Requirements: Node.js and Chromium for the browser tests.

```bash
npm install
npx playwright install chromium
npm run build
npm test
npx wrangler dev
```

Edit files under `src/app/`, then rebuild the generated artifact:

```bash
npm run build
```

The test suite covers structure, offline UI flows, scanning, recipes, demo
mode, accounts, households, push notifications and Worker endpoints.

## Deploy

The recommended deployment serves the app and API from one Cloudflare Worker:

```bash
npm run build
npx wrangler deploy
```

Optional secrets:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OFF_USER_ID
npx wrangler secret put OFF_PASSWORD
```

Never commit secret values. The repository's `.gitignore` and `.assetsignore`
keep local tooling, generated bundles and secrets out of source control and
the static asset upload.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/app/` | Editable HTML, CSS, translations and client modules |
| `scripts/build-app.mjs` | Builds the single-file client artifact |
| `kulpio_app.html` | Generated offline app |
| `service-worker.js` | Offline cache and notifications |
| `ai-proxy/worker.js` | Cloudflare Worker backend and API proxy |
| `tests/` | Structure, browser smoke and Worker tests |
| `docs/` | Architecture, project report and impact documentation |
| `ANDROID.md` | Android Trusted Web Activity packaging guide |

## Licensing

Kulpio is dual-licensed:

1. **[GNU AGPL v3.0](LICENSE)** for compliant free/open-source use.
2. **[Commercial licensing](COMMERCIAL-LICENSE.md)** for proprietary or
   closed-source commercial use.

See [`NOTICE`](NOTICE) for attribution information.

<div align="center">
<sub>Built by Daniil Bejenari</sub>
</div>
