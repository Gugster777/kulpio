# Kulpio on Android (Play Store)

Kulpio is a PWA, so the Android app is a thin **TWA** (Trusted Web Activity) that
runs the exact same web app full-screen. No rewrite — it's a packaging step.

Two things are already wired for you in this repo:

- **`manifest.webmanifest`** is TWA/Play-ready (name, `id`, maskable icons,
  standalone display, theme colours, shortcuts).
- The Worker serves **`/.well-known/assetlinks.json`** — the file Android checks
  to run the app without a browser address bar. It's empty until you fill in the
  two variables below (see step 3).

## Package it

Prereqs: a live HTTPS deploy of the app, and a Google Play Console account
(one-time $25).

1. **Easiest — PWABuilder (no Android Studio):**
   - Go to <https://www.pwabuilder.com>, paste your live URL
     (`https://kulpio.daneabejenari0103.workers.dev` or a custom domain).
   - **Package for Android → Generate.** You get a signed `.aab` and the app's
     SHA-256 signing fingerprint.

   **Or — Bubblewrap CLI** (needs Java + Android SDK): `twa-manifest.json` in the
   repo root is pre-filled — run `npx @bubblewrap/cli build` and edit `host` /
   `packageId` if your domain or package name differs.

2. **Upload the `.aab`** to Play Console and create the listing.

3. **Link the app to the domain** so it opens chrome-less. Set these as **Worker
   variables** (Cloudflare → kulpio Worker → Settings → Variables):
   - `ANDROID_PACKAGE` — your app's package id (e.g. `app.kulpio.twa`).
   - `ANDROID_FINGERPRINT` — the SHA-256 fingerprint from step 1 (comma-separate
     if more than one, e.g. the upload key and Play's app-signing key).

   The Worker then serves a valid `assetlinks.json` automatically — no app
   redeploy needed. Verify at
   `https://<your-domain>/.well-known/assetlinks.json`.

That's it. Updates to the web app show up in the Android app automatically (it
loads your live URL); you only re-publish the `.aab` if the wrapper itself
changes.
