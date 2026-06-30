# Kulpio AI proxy

The Kulpio app is a single static HTML file with **no backend**. To use the AI
features (smarter expiry estimates + reading a best‑before date off a photo) it
needs a tiny server to hold your Anthropic API key — you can never put the key
in the HTML, because anyone could read and steal it.

This folder is that server: one Cloudflare Worker (`worker.js`). It's free for
this kind of low volume.

Without it, Kulpio still works — it just falls back to the built‑in offline
shelf‑life estimates.

## What it does

The app POSTs to your Worker URL:

| App sends | Worker replies |
|---|---|
| `{ "name": "Greek yogurt 500g" }` | `{ "days": 14 }` |
| `{ "image": "<base64>", "mediaType": "image/jpeg" }` | `{ "name": "Greek yogurt", "bestBefore": "2026-07-12", "days": 14 }` |

The Worker calls Claude (`claude-haiku-4-5`) and returns plain JSON.

## Setup (about 5 minutes)

1. **Get an Anthropic API key** at <https://console.anthropic.com> → API Keys.
2. **Create the Worker.** Easiest no‑install route:
   - Go to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Worker**.
   - Replace the starter code with the contents of `worker.js`, then **Deploy**.
   - (CLI alternative: `npm i -g wrangler`, then `wrangler deploy worker.js`.)
3. **Add the key as a secret** (never paste it into the code):
   - Worker → **Settings** → **Variables and Secrets** → add **`ANTHROPIC_API_KEY`** = your key.
   - *(Optional, recommended)* add **`ALLOWED_ORIGIN`** = your Kulpio site URL
     (e.g. `https://gugster777.github.io`) so only your app can call the Worker.
4. **Copy the Worker URL** (looks like `https://kulpio-ai.<you>.workers.dev`).
5. **In the Kulpio app:** open the menu (☰) → **AI setup** → paste the URL → OK.

That's it. New products will now get a Claude estimate when you're online, and
the scanner's **🤖 Read label** button can read a photo of an item or its
best‑before date.

## Cost & notes

- Estimates are tiny requests, and `MODEL` is set to `claude-haiku-4-5` for low
  cost. For maximum quality, change it in `worker.js` to `claude-opus-4-8`.
- Set `ALLOWED_ORIGIN` so strangers can't run up your bill against your key.
- To stop using AI, clear the URL in **AI setup** — the app reverts to offline
  estimates.
