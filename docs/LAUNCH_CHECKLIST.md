# Kulpio production launch checklist

This is the short path from a clean checkout to a verifiable public release.

## 1. Build and verify locally

```bash
npm ci
npx playwright install chromium
npm test
```

The test command rebuilds `kulpio_app.html`, runs the structure and browser
smoke suites, then runs the Worker, push, auth, household and AI-limit tests.

## 2. Cloudflare deployment

Use the root `wrangler.jsonc`; it deploys the static app and
`ai-proxy/worker.js` together.

```bash
npx wrangler login
npx wrangler d1 create kulpio-scans   # only if the database does not exist
npx wrangler deploy
```

Confirm the D1 `database_id` in `wrangler.jsonc` is the database you intend to
use. After deployment, verify:

```bash
curl -fsS https://<worker-host>/healthz
curl -fsS https://<worker-host>/.well-known/assetlinks.json
```

The first response must contain `"ok":true`. The second contains the Android
link only after `ANDROID_PACKAGE` and `ANDROID_FINGERPRINT` are configured.

## 3. Required and optional secrets

The app works without optional AI, email and push integrations, but a complete
launch should configure these in the Worker dashboard or with `wrangler secret
put`:

| Variable/secret | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Higher-quality AI fallback; Workers AI remains the default. |
| `RESEND_API_KEY` + `MAIL_FROM` | Email verification and password reset. |
| `MAIL_APP_URL` | Public URL used in auth email links. |
| `VAPID_PUBLIC` + `VAPID_PRIVATE_JWK` | Real push notification delivery. |
| `VAPID_SUBJECT` | VAPID contact, normally a `mailto:` address. |
| `ANDROID_PACKAGE` + `ANDROID_FINGERPRINT` | Chrome-less Android TWA launch. |

Set `ALLOWED_ORIGIN` when the app and Worker use different origins. For the
all-in-one deployment the Worker defaults to same-origin CORS.

## 4. Push and database readiness

The community tables, including `pushsubs`, are created lazily by the Worker.
If you prefer an explicit migration, run:

```bash
npx wrangler d1 execute kulpio-scans --remote --command \
  "CREATE TABLE IF NOT EXISTS pushsubs (endpoint TEXT PRIMARY KEY, nextexp INTEGER, ts INTEGER)"
```

Enable Notifications in an installed HTTPS PWA, then verify that the device
subscription is present in D1 and that the daily cron is enabled in the Worker.

## 5. Release gates

- Check the live app on a fresh mobile browser and as an installed PWA.
- Test English plus at least one RTL language (Arabic or Hebrew).
- Test add, edit, scan, expiry alert, recipe, sign-in and offline reload.
- Confirm `healthz`, Digital Asset Links and the manifest return 200 responses.
- Review Cloudflare logs and AI usage after the first real traffic.
- Publish the Android `.aab` only after Digital Asset Links uses the final
  Play signing fingerprint.
