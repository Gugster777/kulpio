/*
 * Kulpio AI proxy — Cloudflare Worker
 * ------------------------------------
 * Answers five kinds of request from kulpio_app.html:
 *
 *   POST { "name": "Greek yogurt 500g" }
 *        -> { "days": 14 }                       // estimated days until expiry
 *
 *   POST { "brands": { "name": "butter", "store": "Linella" } }
 *        -> { "brands": ["JLC", "Lactis", …] }   // brands that chain stocks
 *
 *   POST { "image": "<base64>", "mediaType": "image/jpeg" }
 *        -> { "name": "Greek yogurt", "bestBefore": "2026-07-12", "days": 14 }
 *
 *   POST { "nutrition": { "title": "Omelette", "ingredients": ["2 eggs", "50g cheese"] } }
 *        -> { "kcal": 320, "protein": 21, "fat": 25, "carbs": 3 }   // per serving
 *
 *   POST { "imageSearch": "casuta mea unt" }
 *        -> { "url": "https://…/photo.jpg" }   // real web photo of the product
 *
 *   POST { "chef": { "items": ["Milk (expires in 2 days)", …], "lang": "ru" } }
 *        -> { "title", "ingredients": [{name,measure}], "steps": [...], "uses": [...] }
 *        // one invented dish from the expiring items, written in that language
 *
 *   POST { "verdict": { "name": "Nutella", "grade": "e", "nova": 4, "adds": ["E322"], "kcal": 539, "lang": "ru" } }
 *        -> { "verdict": "…" }   // the pear's one-line take, in that language
 *
 * Brains, in order of preference:
 *   1. Anthropic Claude — used when the ANTHROPIC_API_KEY secret is set
 *      (NEVER put a key in the app's HTML; best quality, costs pennies).
 *   2. Cloudflare Workers AI (Llama) — the zero-config free default via the
 *      `AI` binding in wrangler.jsonc / wrangler.toml.
 *
 * Deploy: see ai-proxy/README.md.
 */

// The app sends its UI language with photo requests; the model is told to
// write the product name in it. Keys mirror kulpio_app.html's 33 locales.
const LANG_NAMES = {
  en: "English", ru: "Russian", ro: "Romanian", de: "German", fr: "French",
  es: "Spanish", it: "Italian", pt: "Portuguese", pl: "Polish", tr: "Turkish",
  ar: "Arabic", zh: "Chinese", ja: "Japanese", ko: "Korean", hi: "Hindi",
  uk: "Ukrainian", nl: "Dutch", sv: "Swedish", no: "Norwegian", da: "Danish",
  fi: "Finnish", cs: "Czech", sk: "Slovak", hu: "Hungarian", bg: "Bulgarian",
  sr: "Serbian", hr: "Croatian", el: "Greek", he: "Hebrew", th: "Thai",
  id: "Indonesian", ms: "Malay", vi: "Vietnamese",
};

const MODEL = "claude-haiku-4-5"; // fast + low-cost; swap to "claude-opus-4-8" for max quality
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// A Google OAuth Client ID is PUBLIC (it's the audience the id token is issued
// for), so it can live in code — this way "Sign in with Google" works from a
// plain deploy, no Worker variable needed. env.GOOGLE_CLIENT_ID still overrides.
const GOOGLE_CLIENT_ID_BUILTIN = "832284986308-kvrk9v1659jdejprq6u69rrtfrhq5h74.apps.googleusercontent.com";
const CF_TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CF_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*"; // set to your site to prevent abuse
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      // Android TWA Digital Asset Links: an installed Kulpio app runs full-screen
      // (no browser bar) only if this file proves it owns the domain. Fill it in
      // by setting ANDROID_PACKAGE + ANDROID_FINGERPRINT (from the Play/Bubblewrap
      // signing key) as Worker variables — no code change or redeploy of the app.
      if (request.method === "GET" && new URL(request.url).pathname === "/.well-known/assetlinks.json") {
        const links = (env.ANDROID_PACKAGE && env.ANDROID_FINGERPRINT) ? [{
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: env.ANDROID_PACKAGE,
            sha256_cert_fingerprints: env.ANDROID_FINGERPRINT.split(",").map((s) => s.trim()).filter(Boolean) },
        }] : [];
        return new Response(JSON.stringify(links), { headers: { "content-type": "application/json", ...cors } });
      }
      // All-in-one deploy (root wrangler.jsonc): static assets are served
      // before the Worker, so a GET landing here is an unknown path — send
      // it to the app. API-only deploys have no ASSETS binding.
      if (request.method === "GET" && env.ASSETS) {
        return Response.redirect(new URL("/kulpio_app.html", request.url), 302);
      }
      return json({ error: "POST only" }, 405, cors);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }

    if (body.imageSearch) {
      // Real web image search (DuckDuckGo Images). No AI call — the Worker
      // just does the CORS-free fetching a browser page can't.
      return imageSearch(String(body.imageSearch).slice(0, 100), cors);
    }

    if (body.scanLog) {
      // Community scan log (D1): one row per successful barcode scan from
      // any install. Anonymous uid, no personal data — just "someone scanned
      // this code at this time". Powers the "Popular now" shelf.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const s = body.scanLog;
      const code = String(s.code || "").replace(/\D/g, "").slice(0, 20);
      const uid = String(s.uid || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
      if (code.length < 6 || uid.length < 8) return json({ error: "bad scan" }, 400, cors);
      const name = String(s.name || "").slice(0, 120);
      const grade = /^[a-e]$/.test(String(s.grade || "")) ? String(s.grade) : "";
      try {
        await env.DB.prepare("INSERT INTO scans (code, name, grade, uid, ts) VALUES (?1, ?2, ?3, ?4, ?5)")
          .bind(code, name, grade, uid, Date.now()).run();
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.rateLog) {
      // Community rating: one vote per install per product (upsert).
      // stars 0 = the user took their rating back → the vote is deleted.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const r = body.rateLog;
      const code = String(r.code || "").replace(/\D/g, "").slice(0, 20);
      const uid = String(r.uid || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
      const stars = parseInt(r.stars, 10) || 0;
      if (code.length < 6 || uid.length < 8 || stars < 0 || stars > 5) return json({ error: "bad rating" }, 400, cors);
      try {
        if (stars === 0) {
          await env.DB.prepare("DELETE FROM ratings WHERE code = ?1 AND uid = ?2").bind(code, uid).run();
        } else {
          await env.DB.prepare(
            "INSERT INTO ratings (code, uid, stars, ts) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(code, uid) DO UPDATE SET stars = ?3, ts = ?4"
          ).bind(code, uid, stars, Date.now()).run();
        }
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.rateGet) {
      // The community average for one product: {avg, n}.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const code = String(body.rateGet.code || "").replace(/\D/g, "").slice(0, 20);
      if (code.length < 6) return json({ error: "bad code" }, 400, cors);
      try {
        const row = await env.DB.prepare(
          "SELECT ROUND(AVG(stars), 1) AS avg, COUNT(*) AS n FROM ratings WHERE code = ?1"
        ).bind(code).first();
        return json({ avg: row && row.n ? row.avg : null, n: row ? row.n : 0 }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.priceLog) {
      // Crowd prices: what someone actually paid for this barcode at this
      // store, in their currency. Raw rows — priceGet averages the recent ones.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const p = body.priceLog;
      const code = String(p.code || "").replace(/\D/g, "").slice(0, 20);
      const uid = String(p.uid || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
      const store = String(p.store || "").replace(/\s+/g, " ").trim().slice(0, 40);
      const price = Math.round((parseFloat(p.price) || 0) * 100) / 100;
      const cur = String(p.cur || "").toUpperCase();
      if (code.length < 6 || uid.length < 8 || !store || price <= 0 || price > 1e6 || !/^[A-Z]{3}$/.test(cur)) {
        return json({ error: "bad price" }, 400, cors);
      }
      try {
        await env.DB.prepare("INSERT INTO prices (code, store, price, cur, uid, ts) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
          .bind(code, store, price, cur, uid, Date.now()).run();
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.priceGet) {
      // Average recent price per store for one barcode, in ONE currency —
      // mixing currencies would average apples with oranges.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const code = String(body.priceGet.code || "").replace(/\D/g, "").slice(0, 20);
      const cur = String(body.priceGet.cur || "").toUpperCase();
      if (code.length < 6 || !/^[A-Z]{3}$/.test(cur)) return json({ error: "bad code" }, 400, cors);
      try {
        const { results } = await env.DB.prepare(
          `SELECT MAX(store) AS store, ROUND(AVG(price), 2) AS avg, COUNT(*) AS n
             FROM prices WHERE code = ?1 AND cur = ?2 AND ts > ?3
            GROUP BY LOWER(store) ORDER BY n DESC, avg ASC LIMIT 4`
        ).bind(code, cur, Date.now() - 90 * 86400000).all();
        return json({ stores: results || [] }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.houseSet) {
      // Shared household: one household state per 6-char code, whole-state
      // last-write-wins. No accounts — the code IS the membership. New apps
      // send an envelope { shop, fridge }; old ones a bare shopping array.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const code = String(body.houseSet.code || "").toUpperCase();
      const uid = String(body.houseSet.uid || "").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40);
      if (!/^[A-Z0-9]{6}$/.test(code) || uid.length < 8) return json({ error: "bad house" }, 400, cors);
      const cleanShop = (arr) => arr.slice(0, 200)
        .map((s) => ({ name: String((s && s.name) || "").slice(0, 80), done: !!(s && s.done) }))
        .filter((s) => s.name);
      let list = null;
      const raw = body.houseSet.list;
      if (Array.isArray(raw)) {
        list = cleanShop(raw);   // legacy: shopping list only
      } else if (raw && typeof raw === "object") {
        // Fridge items travel as the app's own product objects; keep them
        // whole (strings capped) so nothing the partner needs gets lost.
        const fridge = (Array.isArray(raw.fridge) ? raw.fridge : []).slice(0, 200)
          .filter((p) => p && typeof p === "object" && p.name)
          .map((p) => { const q = { ...p }; for (const k in q) if (typeof q[k] === "string") q[k] = q[k].slice(0, 500); return q; });
        list = { shop: cleanShop(Array.isArray(raw.shop) ? raw.shop : []), fridge };
      }
      if (!list) return json({ error: "bad list" }, 400, cors);
      const blob = JSON.stringify(list);
      if (blob.length > 200000) return json({ error: "too big" }, 400, cors);
      try {
        await env.DB.prepare("INSERT INTO households (code, list, ts) VALUES (?1, ?2, ?3) ON CONFLICT(code) DO UPDATE SET list = ?2, ts = ?3")
          .bind(code, blob, Date.now()).run();
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.houseGet) {
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const code = String(body.houseGet.code || "").toUpperCase();
      if (!/^[A-Z0-9]{6}$/.test(code)) return json({ error: "bad house" }, 400, cors);
      try {
        const row = await env.DB.prepare("SELECT list, ts FROM households WHERE code = ?1").bind(code).first();
        if (!row) return json({ list: null, ts: 0 }, 200, cors);   // fresh code — first push creates it
        let list = [];
        try { list = JSON.parse(row.list); } catch {}
        return json({ list, ts: row.ts }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    // ── ACCOUNTS + PER-USER SYNC ─────────────────────────────────────
    // Self-contained auth in D1: PBKDF2-hashed passwords, opaque session
    // tokens, and a per-user data blob the app syncs its fridge into. Tables
    // are created on first use — no manual migration. Google/Microsoft verify
    // the provider's signed ID token against its public keys; the audience
    // must match a configured client id (GOOGLE_CLIENT_ID / MS_CLIENT_ID),
    // so those buttons stay off until you set one — email/password always works.
    if (body.auth || body.userGet || body.userSet) {
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      try {
      await ensureAuthTables(env);
      const a = body.auth || {};

      if (a.signup) {
        const email = normEmail(a.signup.email);
        const pass = String(a.signup.pass || "");
        if (!emailOk(email)) return json({ error: "bad email" }, 400, cors);
        if (pass.length < 8) return json({ error: "weak pass" }, 400, cors);
        const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?1").bind(email).first();
        if (exists) return json({ error: "exists" }, 409, cors);
        const { salt, hash } = await hashPassword(pass);
        const id = crypto.randomUUID();
        const name = String(a.signup.name || email.split("@")[0]).slice(0, 60);
        await env.DB.prepare("INSERT INTO users (id, email, pass, salt, provider, name, ts) VALUES (?1,?2,?3,?4,'email',?5,?6)")
          .bind(id, email, hash, salt, name, Date.now()).run();
        return json({ token: await newSession(env, id), user: { email, name } }, 200, cors);
      }

      if (a.login) {
        const email = normEmail(a.login.email);
        const u = await env.DB.prepare("SELECT id, pass, salt, name, avatar FROM users WHERE email = ?1").bind(email).first();
        if (!u || !u.pass || !(await verifyPassword(String(a.login.pass || ""), u.salt, u.pass))) {
          return json({ error: "bad creds" }, 401, cors);
        }
        return json({ token: await newSession(env, u.id), user: { email, name: u.name, avatar: u.avatar || "" } }, 200, cors);
      }

      if (a.google || a.microsoft) {
        const isG = !!a.google;
        const aud = isG ? (env.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID_BUILTIN) : env.MS_CLIENT_ID;
        if (!aud) return json({ error: "provider off" }, 501, cors);
        const claims = await verifyOidc(String((a.google || a.microsoft).idToken || ""), isG ? "google" : "microsoft", aud);
        if (!claims || !claims.email) return json({ error: "bad token" }, 401, cors);
        const email = normEmail(claims.email);
        let u = await env.DB.prepare("SELECT id, name, avatar FROM users WHERE email = ?1").bind(email).first();
        if (!u) {
          const id = crypto.randomUUID();
          const name = String(claims.name || email.split("@")[0]).slice(0, 60);
          await env.DB.prepare("INSERT INTO users (id, email, provider, name, ts) VALUES (?1,?2,?3,?4,?5)")
            .bind(id, email, isG ? "google" : "microsoft", name, Date.now()).run();
          u = { id, name, avatar: "" };
        }
        return json({ token: await newSession(env, u.id), user: { email, name: u.name, avatar: u.avatar || "" } }, 200, cors);
      }

      if (a.me) {
        const s = await sessionUser(env, a.me.token);
        return json({ user: s ? { email: s.email, name: s.name, avatar: s.avatar || "" } : null }, 200, cors);
      }
      if (a.update) {
        const s = await sessionUser(env, a.update.token);
        if (!s) return json({ error: "unauth" }, 401, cors);
        const name = String(a.update.name || s.name || "").trim().slice(0, 60);
        const avatar = String(a.update.avatar || "").slice(0, 8);
        await env.DB.prepare("UPDATE users SET name = ?1, avatar = ?2 WHERE id = ?3").bind(name, avatar, s.id).run();
        return json({ ok: true, user: { email: s.email, name, avatar } }, 200, cors);
      }
      if (a.logout) {
        const t = String(a.logout.token || "");
        if (t) await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(t).run().catch(() => {});
        return json({ ok: true }, 200, cors);
      }

      if (body.userGet) {
        const s = await sessionUser(env, body.userGet.token);
        if (!s) return json({ error: "unauth" }, 401, cors);
        const row = await env.DB.prepare("SELECT data, ts FROM userdata WHERE uid = ?1").bind(s.id).first();
        if (!row) return json({ data: null, ts: 0 }, 200, cors);
        let data = null; try { data = JSON.parse(row.data); } catch {}
        return json({ data, ts: row.ts }, 200, cors);
      }
      if (body.userSet) {
        const s = await sessionUser(env, body.userSet.token);
        if (!s) return json({ error: "unauth" }, 401, cors);
        const blob = JSON.stringify(body.userSet.data || {});
        if (blob.length > 400000) return json({ error: "too big" }, 400, cors);
        const now = Date.now();
        await env.DB.prepare("INSERT INTO userdata (uid, data, ts) VALUES (?1,?2,?3) ON CONFLICT(uid) DO UPDATE SET data=?2, ts=?3")
          .bind(s.id, blob, now).run();
        return json({ ok: true, ts: now }, 200, cors);
      }
      return json({ error: "bad auth op" }, 400, cors);
      } catch (e) {
        console.error("auth error", e && e.message);
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.pushKey) {
      // The app asks for the VAPID public key before subscribing. An empty
      // key means push isn't configured on this deploy — the app silently
      // keeps its open-app notifications only.
      return json({ key: env.VAPID_PUBLIC || "" }, 200, cors);
    }

    if (body.pushSet) {
      // Register (or refresh) a push subscription together with the time the
      // user's soonest item expires. The daily cron pokes exactly the
      // subscriptions whose food needs attention — the push itself carries
      // no payload and no personal data; the device wakes and shows its own
      // locally-written notification.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const s = body.pushSet;
      const endpoint = String((s.sub && s.sub.endpoint) || "").slice(0, 500);
      const nextExp = parseInt(s.nextExp, 10) || 0;
      if (!/^https:\/\//.test(endpoint)) return json({ error: "bad sub" }, 400, cors);
      try {
        await env.DB.prepare(
          "INSERT INTO pushsubs (endpoint, nextexp, ts) VALUES (?1, ?2, ?3) ON CONFLICT(endpoint) DO UPDATE SET nextexp = ?2, ts = ?3"
        ).bind(endpoint, nextExp, Date.now()).run();
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.pushDel) {
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      const endpoint = String(body.pushDel.endpoint || "").slice(0, 500);
      try {
        await env.DB.prepare("DELETE FROM pushsubs WHERE endpoint = ?1").bind(endpoint).run();
        return json({ ok: true }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    if (body.scanTop) {
      // Most-scanned products across all users in the last 30 days. Ranked
      // by DISTINCT scanners first, so one enthusiast rescanning the same
      // jar can't fill the chart alone.
      if (!env.DB) return json({ error: "no db" }, 501, cors);
      try {
        const { results } = await env.DB.prepare(
          `SELECT code, MAX(name) AS name, MAX(grade) AS grade,
                  COUNT(*) AS n, COUNT(DISTINCT uid) AS users
             FROM scans WHERE ts > ?1 AND name != ''
            GROUP BY code ORDER BY users DESC, n DESC LIMIT 8`
        ).bind(Date.now() - 30 * 86400000).all();
        return json({ top: results || [] }, 200, cors);
      } catch {
        return json({ error: "db" }, 500, cors);
      }
    }

    // Describe the task once; either brain below can run it.
    // task = { prompt, schema, maxTokens, image?, mediaType? }
    const today = new Date().toISOString().slice(0, 10);
    let task;

    if (body.translate) {
      // Batch translation of recipe strings (titles, ingredient names,
      // cooking steps) into the app's UI language — natural culinary
      // wording, unlike the free machine translators.
      const langName = LANG_NAMES[body.translate.lang];
      if (!langName) return json({ error: "bad lang" }, 400, cors);
      let texts = Array.isArray(body.translate.texts) ? body.translate.texts.map((t) => String(t || "").slice(0, 600)) : [];
      texts = texts.slice(0, 60);
      if (!texts.length) return json({ error: "no texts" }, 400, cors);
      // Output budget must scale with the input — a fixed cap truncates big
      // step batches mid-JSON and the whole batch dies on "parse"/"count".
      const totalChars = texts.reduce((n, t) => n + t.length, 0);
      task = {
        maxTokens: Math.min(6000, 400 + totalChars),
        expectTexts: texts.length,
        prompt: `Translate the following English recipe strings into natural, concise ${langName} — the wording a native-speaker cookbook would use (e.g. an ingredient "Oil" is Russian «растительное масло», never a literal adjective or a transliteration). Preserve EVERY descriptor and qualifier by translating it, never dropping or replacing it: "Greek yogurt" keeps its "Greek" (German "griechischer Joghurt", Finnish "kreikkalainen jogurtti"), "smoked", "low fat", "red" etc. all stay. Beware calques and false friends — translate the culinary MEANING, never copy an English word that has a different sense in the target language. The cooking liquid "stock"/"broth" ALWAYS becomes the native word for broth: Romanian "supă"/"zeamă" ("Chicken Stock" → "Supă de pui" — "stoc" is FORBIDDEN, it means warehouse inventory), Russian «бульон», Italian "brodo". Items may be dish titles, ingredient names or cooking instructions; keep quantities and units natural. Return exactly ${texts.length} translations, same order, one per input.\nInput JSON: ${JSON.stringify(texts)}`,
        schema: {
          type: "object",
          properties: {
            texts: { type: "array", items: { type: "string" }, description: "the translations, same order and count as the input" },
          },
          required: ["texts"],
          additionalProperties: false,
        },
      };
    } else if (body.image) {
      // Vision: read product + printed best-before date off a photo. The
      // name comes back in the app's UI language (brand names stay as-is).
      const langName = LANG_NAMES[body.lang] || "English";
      const inLang = nameInLang(langName);
      task = {
        image: body.image,
        mediaType: body.mediaType || "image/jpeg",
        maxTokens: 300,
        langName,
        today,
        prompt: `Today is ${today}. Identify this grocery product and read any printed "best before"/"use by"/expiry date. Reply with the product name, bestBefore (YYYY-MM-DD if a date is visible, otherwise omit), and days (your estimate of days from today until it spoils if no date is printed).${inLang}`,
        schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "short product name" },
            bestBefore: { type: "string", description: "printed expiry date as YYYY-MM-DD, omit if none visible" },
            days: { type: "integer", description: "estimated days from today until it goes bad if no date is printed" },
          },
          required: ["name", "days"],
          additionalProperties: false,
        },
      };
    } else if (body.brands && body.brands.name) {
      // Store-aware brand suggestions: which brands of this product would a
      // shopper actually find at that chain (e.g. butter at Linella → the
      // Moldovan dairies). The model infers the chain's country and leads
      // with its local market leaders — the coverage OFF doesn't have.
      const bName = String(body.brands.name).slice(0, 80);
      const bStore = String(body.brands.store || "").slice(0, 60);
      // Chains the model can't place get their country pinned here — Llama
      // guessed Lithuania for Linella. Lowercased substring match.
      const CHAIN_COUNTRY = { linella: "Moldova", fidesco: "Moldova", "green hills": "Moldova", "nr1": "Moldova", "nr. 1": "Moldova", "№1": "Moldova", merci: "Moldova" };
      let pinned = "";
      const storeLc = bStore.toLowerCase();
      for (const chain in CHAIN_COUNTRY) if (storeLc.includes(chain)) { pinned = CHAIN_COUNTRY[chain]; break; }
      // The country field is answered BEFORE the brands on purpose: forcing
      // the model to name the chain's home country first makes it actually
      // use that fact — without it, Llama listed Ferrero and Lurpak as
      // "Linella" butter instead of the Moldovan dairies.
      task = {
        maxTokens: 250,
        prompt: bStore
          ? (pinned
              ? `"${bStore}" is a supermarket chain in ${pinned}. List up to 5 brands of ${bName} a shopper would find on its shelves there: START with ${pinned}'s own domestic producers of ${bName} (the local market leaders), then at most 1-2 international brands. Real existing brands only — omit any you are unsure of. Brand names only.`
              : `"${bStore}" is a supermarket chain. First name the country it operates in. Then list up to 5 brands of ${bName} a shopper would find on its shelves there: START with that country's own domestic producers of ${bName} (the local market leaders), then at most 1-2 international brands. Real existing brands only — omit any you are unsure of. Brand names only.`)
          : `List up to 5 well-known brand names of this grocery product: ${bName}. Most widely available first; just the brand names.`,
        schema: {
          type: "object",
          properties: {
            country: { type: "string", description: "the country the named supermarket chain operates in (empty if no store given)" },
            brands: { type: "array", items: { type: "string" }, description: "brand names: domestic producers of that country first, then international" },
          },
          required: ["brands"],
          additionalProperties: false,
        },
      };
    } else if (body.chef && Array.isArray(body.chef.items) && body.chef.items.length) {
      // Pear chef: invent ONE simple dish from the fridge's soonest-to-expire
      // items. The whole answer is written directly in the app's UI language,
      // so the app skips its usual EN→lang re-translation for this recipe.
      const langName = LANG_NAMES[body.chef.lang] || "English";
      const items = body.chef.items.slice(0, 10).map((s) => String(s).slice(0, 60));
      task = {
        maxTokens: 1000,
        prompt: `These grocery items in a home fridge expire soonest: ${items.join("; ")}.\nInvent ONE simple, realistic home dish that uses as many of them as possible, plus common pantry staples (salt, oil, onion, flour…) — nothing exotic that would need a shopping trip. Write EVERY field in natural ${langName}. Return: title — a short appetizing dish name; ingredients — each with a name and a household measure (e.g. "200 g", "2 pcs"); steps — 3 to 7 short cooking steps in order; uses — which of the listed fridge items the dish uses, copied exactly as written in the list but WITHOUT the parenthetical.`,
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "short dish name, in " + langName },
            ingredients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "ingredient name, in " + langName },
                  measure: { type: "string", description: "household quantity, e.g. 200 g" },
                },
                required: ["name"],
                additionalProperties: false,
              },
              description: "every ingredient the dish needs",
            },
            steps: { type: "array", items: { type: "string" }, description: "3-7 short cooking steps, in " + langName },
            uses: { type: "array", items: { type: "string" }, description: "the fridge items the dish uses, copied exactly from the list" },
          },
          required: ["title", "ingredients", "steps"],
          additionalProperties: false,
        },
      };
    } else if (body.receipt && body.receipt.image) {
      // A photo of the till RECEIPT → the store name plus every purchased
      // food line with its printed price, ready to land in the fridge in
      // one shot. Item names stay in the receipt's own language.
      task = {
        image: body.receipt.image,
        mediaType: body.receipt.mediaType || "image/jpeg",
        maxTokens: 1600,
        // Workers AI two-step: the vision model only transcribes…
        visionPrompt: 'This is a photo of a store receipt. Transcribe it plainly: the store name at the top, then every purchased line item with its printed price, one per line, in the receipt\'s original language. If this is not a receipt, write "NOT A RECEIPT".',
        visionTokens: 900,
        // …and the text model structures the transcription:
        structPrompt: `A store receipt was transcribed by a vision system as:\n"""{DESC}"""\nExtract the store name and every purchased FOOD or drink item with its printed line price. Ignore deposits, bags, discounts, loyalty lines, subtotals, totals and VAT lines. Keep item names short, in the receipt's own language, without quantities or unit codes. If the transcription says NOT A RECEIPT, return an empty items array.`,
        // Anthropic reads the photo directly with this prompt:
        prompt: `This is a photo of a store receipt. Return the store name and every purchased FOOD or drink item with its printed line price. Ignore deposits, bags, discounts, loyalty lines, subtotals, totals and VAT lines. Keep item names short, in the receipt's own language, without quantities or unit codes. If this is not a receipt, return an empty items array.`,
        schema: {
          type: "object",
          properties: {
            store: { type: "string", description: "short store or chain name, empty string if unreadable" },
            items: {
              type: "array",
              description: "the purchased food/drink items",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "short item name as printed" },
                  price: { type: "number", description: "printed line price, 0 if unreadable" },
                },
                required: ["name"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      };
    } else if (body.verdict && body.verdict.name) {
      // Pear verdict: the mascot's one-line take on a scanned product, from
      // the composition facts the app sends (Rate&Goods has community
      // reviews; Kulpio has the pear).
      const v = body.verdict;
      const langName = LANG_NAMES[v.lang] || "English";
      const facts = [];
      const grade = String(v.grade || "").toLowerCase();
      if (/^[a-e]$/.test(grade)) facts.push(`Nutri-Score ${grade.toUpperCase()}`);
      const nova = parseInt(v.nova, 10);
      if (nova >= 1 && nova <= 4) facts.push(`NOVA group ${nova}${nova === 4 ? " (ultra-processed)" : ""}`);
      if (Array.isArray(v.adds)) {
        const adds = v.adds.slice(0, 12).map((a) => String(a).slice(0, 8));
        facts.push(adds.length ? `additives: ${adds.join(", ")}` : "no additives");
      }
      if (typeof v.kcal === "number") facts.push(`${Math.round(v.kcal)} kcal per 100 g`);
      // plain: constrained JSON mode is precisely what broke this task on
      // free Llama — 5024 "JSON Model couldn't be met" failures, and the
      // grammar pressure made it ignore the language instruction and answer
      // in English. One sentence needs no JSON: the Workers AI path asks for
      // raw text and wraps it itself. (Anthropic still gets the schema.)
      task = {
        plain: "verdict",
        maxTokens: 150,
        prompt: `You are a friendly cartoon pear mascot in a food-freshness app. A user just scanned: "${String(v.name).slice(0, 80)}"${v.brand ? ` by ${String(v.brand).slice(0, 40)}` : ""}. Known facts: ${facts.length ? facts.join("; ") : "nothing — composition unknown"}.\nGive your one-sentence verdict on this product — honest about how healthy it is (praise clean products, gently tease junk food, admit when you know nothing), playful but useful, at most 18 words. No emoji, no preamble, no quotes.\nReply with ONLY the sentence, written in natural ${langName}.`,
        schema: {
          type: "object",
          properties: { verdict: { type: "string", description: "one short playful sentence, written in " + langName } },
          required: ["verdict"],
          additionalProperties: false,
        },
      };
    } else if (body.name) {
      // Text: estimate shelf life from a product name.
      task = {
        maxTokens: 100,
        prompt: `Estimate the typical number of days until this grocery item is no longer good to eat, freshly bought and stored normally (fridge or pantry as appropriate): "${body.name}". Return only the day count.`,
        schema: {
          type: "object",
          properties: { days: { type: "integer", description: "typical days until it spoils, stored normally" } },
          required: ["days"],
          additionalProperties: false,
        },
      };
    } else if (body.nutrition && body.nutrition.title) {
      // Nutrition: estimate БЖУ per serving from the recipe's ingredient list.
      const n = body.nutrition;
      const ings = (Array.isArray(n.ingredients) ? n.ingredients : []).slice(0, 30).join("; ");
      task = {
        maxTokens: 200,
        prompt: `Estimate the nutrition PER SERVING of this recipe.\nTitle: ${String(n.title).slice(0, 200)}\nIngredients: ${ings}\nAssume the recipe serves a typical number of people for a dish of this kind. Return kcal, protein, fat and carbs (grams) per serving.`,
        schema: {
          type: "object",
          properties: {
            kcal: { type: "number", description: "calories per serving" },
            protein: { type: "number", description: "protein grams per serving" },
            fat: { type: "number", description: "fat grams per serving" },
            carbs: { type: "number", description: "carbohydrate grams per serving" },
          },
          required: ["kcal", "protein", "fat", "carbs"],
          additionalProperties: false,
        },
      };
    } else {
      return json({ error: "send name, image, nutrition, brands, chef or verdict" }, 400, cors);
    }

    if (env.ANTHROPIC_API_KEY) return anthropic(task, env, cors);
    if (env.AI) return workersAI(task, env, cors);
    return json({ error: "no key configured" }, 500, cors);
  },

  // Daily cron (wrangler.jsonc → triggers.crons): wake every device whose
  // soonest item expires within the next ~26 hours. The push is EMPTY —
  // no payload encryption needed, no user data leaves the device; the
  // service worker shows a locally-stored, localized notification.
  async scheduled(event, env) {
    if (!env.DB || !env.VAPID_PUBLIC || !env.VAPID_PRIVATE_JWK) return;
    const now = Date.now();
    let rows;
    try {
      ({ results: rows } = await env.DB.prepare(
        // nextexp within [-2 days, +26 h]: covers "expires today/tomorrow"
        // and keeps nagging for two days if the item is left to rot.
        "SELECT endpoint FROM pushsubs WHERE nextexp > ?1 AND nextexp < ?2 LIMIT 500"
      ).bind(now - 2 * 864e5, now + 26 * 36e5).all());
    } catch { return; }
    for (const row of rows || []) {
      try {
        const res = await fetch(row.endpoint, {
          method: "POST",
          headers: { ...(await vapidHeaders(row.endpoint, env)), TTL: "86400", Urgency: "normal" },
        });
        // The push service says this subscription is dead — drop it.
        if (res.status === 404 || res.status === 410) {
          await env.DB.prepare("DELETE FROM pushsubs WHERE endpoint = ?1").bind(row.endpoint).run();
        }
      } catch {}
    }
  },
};

// ── WEB PUSH (VAPID, RFC 8292) ──────────────────────────────────
// Authorization for browser push services: an ES256-signed JWT whose
// audience is the push service origin. Secrets: VAPID_PUBLIC (base64url,
// uncompressed P-256 point) and VAPID_PRIVATE_JWK (the private key as JWK
// JSON) — generate both with tools/gen-vapid.mjs.
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function vapidHeaders(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const claims = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || "mailto:push@kulpio.app" };
  const enc = new TextEncoder();
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify(claims)));
  const key = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  // WebCrypto ECDSA already emits the raw r||s form JWS wants.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(head + "." + body));
  return { Authorization: `vapid t=${head}.${body}.${b64u(sig)}, k=${env.VAPID_PUBLIC}` };
}

// One naming instruction for both brains — tune it here, not in two places.
function nameInLang(langName) {
  return langName === "English" ? "" :
    ` Write the product name in natural ${langName} as a native speaker would say it — translate descriptors like "plain"/"low fat" idiomatically (e.g. Russian «без добавок», not a transliteration like «Плайн»), never transliterate English words; keep brand names as printed.`;
}

// Shared post-validation for whichever brain answered — every output
// invariant lives here exactly once.
function finish(task, out, cors) {
  if (task.expectTexts && (!Array.isArray(out.texts) || out.texts.length !== task.expectTexts)) {
    return json({ error: "count" }, 502, cors);
  }
  if (typeof out.days === "number") {
    // "Lasts forever" answers (999…) would bury the item for years; and a
    // negative estimate without a printed date to justify it is nonsense.
    if (out.days > 365) out.days = 365;
    if (out.days < 0 && !out.bestBefore) out.days = 0;
  }
  // A bestBefore is only trusted when its year literally appears in what the
  // vision model transcribed off the label (task.desc, Workers AI path) —
  // invented dates don't survive this, genuinely printed ones do.
  if (task.image && task.desc && typeof out.bestBefore === "string") {
    const yr = out.bestBefore.slice(0, 4);
    if (!task.desc.includes(yr) && !task.desc.includes(yr.slice(2))) {
      delete out.bestBefore;
      delete out.days; // it was derived from the fake date — let the app fall back
    }
  }
  return json(out, 200, cors);
}

// ---------------------------------------------------------------- Anthropic

async function anthropic(task, env, cors) {
  const content = task.image
    ? [
        { type: "image", source: { type: "base64", media_type: task.mediaType, data: task.image } },
        { type: "text", text: task.prompt },
      ]
    : task.prompt;
  const payload = {
    model: MODEL,
    max_tokens: task.maxTokens,
    output_config: { format: { type: "json_schema", schema: task.schema } },
    messages: [{ role: "user", content }],
  };

  let res;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return json({ error: "upstream unreachable" }, 502, cors);
  }
  if (!res.ok) return json({ error: "upstream " + res.status }, 502, cors);

  const data = await res.json();
  const block = (data.content || []).find((b) => b.type === "text");
  if (!block) return json({ error: "no output" }, 502, cors);
  let out;
  try { out = JSON.parse(block.text); } catch { return json({ error: "parse" }, 502, cors); }
  return finish(task, out, cors);
}

// ------------------------------------------------------- Cloudflare Workers AI

async function workersAI(task, env, cors) {
  let res;
  try {
    let prompt = task.prompt;
    if (task.image && task.structPrompt) {
      // Generic two-step (receipts, and any future photo task): the vision
      // model transcribes with the task's own instruction, then the text
      // model structures via {DESC}. The label flow below stays untouched.
      const bytes = Uint8Array.from(atob(task.image), (c) => c.charCodeAt(0));
      const seen = await env.AI.run(CF_VISION_MODEL, {
        prompt: task.visionPrompt,
        image: [...bytes],
        max_tokens: task.visionTokens || 600,
      });
      const desc = String(seen && seen.response || "").slice(0, 4000).replace(/"{3,}/g, '"');
      if (!desc) return json({ error: "no output" }, 502, cors);
      prompt = task.structPrompt.replace("{DESC}", desc);
    } else if (task.image) {
      // Two steps: the small vision model is only asked to LOOK (describe
      // + transcribe), then the big text model structures the answer with
      // strict JSON mode. One-shot JSON from the 11B vision model proved
      // unreliable (schema echoes, invented dates, prose in other langs).
      const bytes = Uint8Array.from(atob(task.image), (c) => c.charCodeAt(0));
      const seen = await env.AI.run(CF_VISION_MODEL, {
        prompt: 'Describe this grocery product photo. What is the product (brand and type)? If an expiry / best-before / use-by date is printed and readable, quote its exact printed text; if none is visible, write "NO DATE".',
        image: [...bytes],
        max_tokens: 300,
      });
      // Strip quote fences so label text can't break out of the """ block
      // in the structuring prompt (prompt injection via the photo).
      const desc = String(seen && seen.response || "").slice(0, 1200).replace(/"{3,}/g, '"');
      if (!desc) return json({ error: "no output" }, 502, cors);
      task.desc = desc; // finish() checks bestBefore against the transcription
      const inLang = nameInLang(task.langName);
      // Trust no model about dates: only offer the bestBefore field to the
      // structuring step when the description contains a literal date
      // string (12.05.27, 05/2027, 2027-05-12, MAY 2027, …) — the vision
      // model happily invents "printed" dates otherwise.
      const hasDate = /\b\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}\b|\b\d{1,2}[.\/\-]\d{4}\b|\b\d{4}-\d{2}(?:-\d{2})?\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?\d{1,4}\b/i.test(desc);
      if (hasDate) {
        prompt = `Today is ${task.today}. A photo of a grocery product was described by a vision system as:\n"""${desc}"""\nReturn: name — a short product name; bestBefore — the printed expiry date as YYYY-MM-DD; days — days from today until that date.${inLang}`;
      } else {
        task.schema = { ...task.schema, properties: { name: task.schema.properties.name, days: task.schema.properties.days } };
        prompt = `Today is ${task.today}. A photo of a grocery product was described by a vision system as:\n"""${desc}"""\nNo printed expiry date is visible. Return: name — a short product name; days — typical days until this kind of product spoils, freshly bought and stored normally.${inLang}`;
      }
    }
    if (task.plain) {
      // Free-text task (one sentence): grammar-constrained JSON is what made
      // Llama time out and 5024 on non-Latin languages — ask for raw text.
      res = await env.AI.run(CF_TEXT_MODEL, {
        messages: [{ role: "user", content: prompt }],
        max_tokens: task.maxTokens,
      });
      let text = String(res && res.response || "").trim()
        .replace(/^["'«»“”`\s]+|["'«»“”`\s]+$/g, "")   // models love to quote themselves
        .slice(0, 240);
      if (!text) return json({ error: "no output" }, 502, cors);
      return finish(task, { [task.plain]: text }, cors);
    }
    res = await env.AI.run(CF_TEXT_MODEL, {
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: task.schema },
      max_tokens: task.maxTokens,
    });
  } catch (e) {
    return json({ error: "workers-ai: " + (e && e.message || e) }, 502, cors);
  }

  const raw = res && res.response;
  let out = raw;
  if (typeof out === "string") out = extractJson(out);
  // Small models sometimes echo the schema shape with the values tucked
  // inside "properties" — unwrap that.
  if (out && out.type === "object" && out.properties && typeof out.properties === "object") out = out.properties;
  if (!out || typeof out !== "object") {
    return json({ error: "parse", raw: String(raw || "").slice(0, 300) }, 502, cors);
  }
  return finish(task, out, cors);
}

// Pull the first {...} object out of a model reply that may wrap it in prose
// or a ```json fence.
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
}

// ---------------------------------------------------------------- accounts
async function ensureAuthTables(env) {
  // Each CREATE runs on its own — D1's batch() is a single transaction and
  // DDL (CREATE TABLE) isn't allowed inside one, so batching these throws.
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, pass TEXT, salt TEXT, provider TEXT, name TEXT, avatar TEXT, ts INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, uid TEXT, ts INTEGER)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS userdata (uid TEXT PRIMARY KEY, data TEXT, ts INTEGER)").run();
  // Add the avatar column to a users table created before it existed (no-op / throws once it's there).
  try { await env.DB.prepare("ALTER TABLE users ADD COLUMN avatar TEXT").run(); } catch {}
}
function normEmail(e) { return String(e || "").trim().toLowerCase().slice(0, 120); }
function emailOk(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function b64(buf) { return btoa(String.fromCharCode(...new Uint8Array(buf))); }
async function pbkdf2(pass, saltBytes) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 150000, hash: "SHA-256" }, key, 256);
  return b64(bits);
}
async function hashPassword(pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: await pbkdf2(pass, salt) };
}
async function verifyPassword(pass, saltB64, hashB64) {
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const hash = await pbkdf2(pass, salt);
  if (hash.length !== hashB64.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ hashB64.charCodeAt(i);
  return diff === 0;   // length-equal constant-time compare
}
async function newSession(env, uid) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[^a-zA-Z0-9]/g, "") + Date.now().toString(36);
  await env.DB.prepare("INSERT INTO sessions (token, uid, ts) VALUES (?1,?2,?3)").bind(token, uid, Date.now()).run();
  return token;
}
async function sessionUser(env, token) {
  token = String(token || "");
  if (token.length < 12) return null;
  const s = await env.DB.prepare("SELECT uid, ts FROM sessions WHERE token = ?1").bind(token).first();
  if (!s) return null;
  if (Date.now() - s.ts > 180 * 86400000) {   // 180-day sessions
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?1").bind(token).run().catch(() => {});
    return null;
  }
  return await env.DB.prepare("SELECT id, email, name, avatar FROM users WHERE id = ?1").bind(s.uid).first();
}
// Verify a Google/Microsoft OpenID Connect ID token: check the RS256 signature
// against the provider's published JWKS, then the audience, issuer and expiry.
function b64urlBytes(s) {
  s = String(s).replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function b64urlJson(s) { return JSON.parse(new TextDecoder().decode(b64urlBytes(s))); }
async function verifyOidc(idToken, provider, aud) {
  try {
    const parts = String(idToken).split(".");
    if (parts.length !== 3) return null;
    const header = b64urlJson(parts[0]);
    const payload = b64urlJson(parts[1]);
    if (payload.aud !== aud) return null;
    if (!payload.exp || Date.now() / 1000 > payload.exp + 60) return null;
    const iss = String(payload.iss || "");
    const okIss = provider === "google"
      ? (iss === "https://accounts.google.com" || iss === "accounts.google.com")
      : /^https:\/\/login\.microsoftonline\.com\/|^https:\/\/sts\.windows\.net\//.test(iss);
    if (!okIss) return null;
    const jwksUrl = provider === "google"
      ? "https://www.googleapis.com/oauth2/v3/certs"
      : "https://login.microsoftonline.com/common/discovery/v2.0/keys";
    const jwks = await (await fetch(jwksUrl)).json();
    const jwk = (jwks.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!ok) return null;
    return { email: payload.email, name: payload.name };
  } catch { return null; }
}

// Find a real product photo on the web via DuckDuckGo Images: first request
// obtains the session token (vqd), second returns JSON results. Returns
// { url: "" } on any failure so the app just keeps its current fallback.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
async function imageSearch(q, cors) {
  try {
    const page = await fetch("https://duckduckgo.com/?q=" + encodeURIComponent(q) + "&iax=images&ia=images",
      { headers: { "user-agent": UA } }).then((r) => r.text());
    const vqd = (page.match(/vqd=["']?([\d-]+)["']?/) || [])[1];
    if (!vqd) return json({ url: "" }, 200, cors);
    const res = await fetch("https://duckduckgo.com/i.js?l=us-en&o=json&q=" + encodeURIComponent(q) + "&vqd=" + vqd,
      { headers: { "user-agent": UA, referer: "https://duckduckgo.com/" } });
    if (!res.ok) return json({ url: "" }, 200, cors);
    const data = await res.json();
    const hit = (data.results || [])[0];
    // Thumbnails are DDG-hosted (stable + small); full images live on
    // arbitrary sites that may block hotlinking.
    return json({ url: hit ? (hit.thumbnail || hit.image || "") : "" }, 200, cors);
  } catch {
    return json({ url: "" }, 200, cors);
  }
}
