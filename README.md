<div align="center">

# Kulpio

<img src="kulpio-icon-192.png" alt="Kulpio pear icon" width="112" height="112">

### Waste less food. Save money. Cook what you already have.

Privacy-first food freshness tracking for phones and desktops.
Works offline, installs as a PWA, and supports 16 languages.

[Live demo](https://kulpio.daneabejenari0103.workers.dev/kulpio_app?demo=1)
· [Open app](https://kulpio.daneabejenari0103.workers.dev/kulpio_app)
· [Report an issue](https://github.com/Gugster777/kulpio/issues)

![Offline-first](https://img.shields.io/badge/works-offline-3a7d44?style=for-the-badge&logo=pwa&logoColor=white)
![Languages](https://img.shields.io/badge/languages-16-e9a23b?style=for-the-badge)
![License](https://img.shields.io/badge/license-AGPL--3.0%20%2B%20commercial-5d4e8c?style=for-the-badge)

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
| **16 languages** | Localized UI with right-to-left support. |

## A fridge that tells you what to do next

Kulpio is designed around a tiny daily loop:

```text
Scan it  ->  See the real facts  ->  Eat it in time  ->  Watch your savings grow
```

No spreadsheets. No endless food diary. Just a calm answer to the question:
**“What should I use first?”**

## See it in action

<div align="center">

### 🥕 Your fridge, but smarter

`📦 Products`  →  `🌱 Freshness`  →  `🍳 Recipes`  →  `💰 Savings`  →  `🌍 Less waste`

</div>

### The first 60 seconds

1. Open the [demo](https://kulpio.daneabejenari0103.workers.dev/kulpio_app?demo=1).
2. Visit **Home** to see the freshness overview and the next items to rescue.
3. Open **Discover** for trending recipes, offers and discount cards.
4. Tap a product to see its facts, freshness meter and practical next action.
5. Open **Profile** to see achievements, savings and the monthly impact view.

That flow is also the easiest way to present Kulpio to someone who has never
seen it before.

## Built for real kitchens

- **Busy morning:** scan a new product instead of typing every detail.
- **End-of-week fridge:** follow the “use soon” list before buying more food.
- **Shared household:** everyone sees the same shopping list and activity.
- **Weak connection:** the core experience remains available offline.
- **Presentation mode:** use the seeded demo without touching personal data.

## A little personality goes a long way 🍐

Kulpio has a friendly pear mascot, playful achievements and visual freshness
states so the app feels like a helpful kitchen companion instead of another
database form:

| 🍐 | ⏳ | 🍳 | 🏆 | 💳 |
| --- | --- | --- | --- | --- |
| Pear tips | Expiry alerts | Recipe ideas | Achievements | Discount cards |

Small actions become visible progress: rescue an item, cook a recipe, earn an
achievement, and watch the savings story grow.

## What makes it different?

Kulpio does not try to become another recipe catalogue or calorie dashboard.
It connects three moments that are usually separate:

**the product you bought → the food that needs attention → the meal you can cook.**

That is why the app is useful before food becomes waste, not only after a
shopping list is empty.

## Try the presentation demo

Open the [instant demo](https://kulpio.daneabejenari0103.workers.dev/kulpio_app?demo=1)
to start with a realistic fridge: products, expiry warnings, history,
achievements, recipes and discount cards are already prepared.

The demo is isolated from real data. Use **Profile -> Exit demo** to leave it;
your original fridge is restored untouched.

> Tip: for a quick presentation, open the demo on a laptop, click **Discover**,
> show the recipe carousel and discount cards, then return to **Home** to show
> the savings and expiry overview.

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

## Production launch

Use the [production launch checklist](docs/LAUNCH_CHECKLIST.md) before sharing
the app publicly. It covers the Cloudflare bindings and secrets, push
notifications, Android Digital Asset Links, health verification and the exact
CI checks used by this repository.

## Frequently asked questions

**Does it work without internet?**

Yes. The app is an offline-first PWA. Network features such as live product
lookups and AI improve the experience when available, but the core fridge,
dates, recipes and local data remain usable offline.

**Does Kulpio upload my fridge automatically?**

No. Personal data stays on the device unless you choose account sync,
household sharing or another network feature.

**Where does barcode information come from?**

From Open Food Facts, with a clear app User-Agent and a server-side proxy.
Unknown products can still be added manually.

**Can I use it on a phone?**

Yes. Open the live app in a mobile browser and choose “Add to Home Screen”.
The same build also works on desktop browsers.

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
