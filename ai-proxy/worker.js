/*
 * Kulpio AI proxy — Cloudflare Worker
 * ------------------------------------
 * Answers four kinds of request from kulpio_app.html:
 *
 *   POST { "name": "Greek yogurt 500g" }
 *        -> { "days": 14 }                       // estimated days until expiry
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
        prompt: `Translate the following English recipe strings into natural, concise ${langName} — the wording a native-speaker cookbook would use (e.g. an ingredient "Oil" is Russian «растительное масло», never a literal adjective or a transliteration). Preserve EVERY descriptor and qualifier by translating it, never dropping or replacing it: "Greek yogurt" keeps its "Greek" (German "griechischer Joghurt", Finnish "kreikkalainen jogurtti"), "smoked", "low fat", "red" etc. all stay. Items may be dish titles, ingredient names or cooking instructions; keep quantities and units natural. Return exactly ${texts.length} translations, same order, one per input.\nInput JSON: ${JSON.stringify(texts)}`,
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
      return json({ error: "send name, image or nutrition" }, 400, cors);
    }

    if (env.ANTHROPIC_API_KEY) return anthropic(task, env, cors);
    if (env.AI) return workersAI(task, env, cors);
    return json({ error: "no key configured" }, 500, cors);
  },
};

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
    if (task.image) {
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
