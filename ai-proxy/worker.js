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

    if (body.image) {
      // Vision: read product + printed best-before date off a photo.
      task = {
        image: body.image,
        mediaType: body.mediaType || "image/jpeg",
        maxTokens: 300,
        prompt: `Today is ${today}. Identify this grocery product and read any printed "best before"/"use by"/expiry date. Reply with the product name, bestBefore (YYYY-MM-DD if a date is visible, otherwise omit), and days (your estimate of days from today until it spoils if no date is printed).`,
        example: `{"name":"Greek yogurt","days":14}` + ` — add "bestBefore":"YYYY-MM-DD" ONLY if an expiry date is actually printed and readable in the photo`,
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
  return json(out, 200, cors);
}

// ------------------------------------------------------- Cloudflare Workers AI

async function workersAI(task, env, cors) {
  let res;
  try {
    if (task.image) {
      // The vision model has no JSON mode — ask for JSON and dig it out.
      const bytes = Uint8Array.from(atob(task.image), (c) => c.charCodeAt(0));
      res = await env.AI.run(CF_VISION_MODEL, {
        prompt: task.prompt + "\nReply with ONLY a minified JSON object shaped exactly like this example, no prose: " + task.example,
        image: [...bytes],
        max_tokens: task.maxTokens,
      });
    } else {
      res = await env.AI.run(CF_TEXT_MODEL, {
        messages: [{ role: "user", content: task.prompt }],
        response_format: { type: "json_schema", json_schema: task.schema },
        max_tokens: task.maxTokens,
      });
    }
  } catch (e) {
    return json({ error: "workers-ai: " + (e && e.message || e) }, 502, cors);
  }

  let out = res && res.response;
  if (typeof out === "string") out = extractJson(out);
  // Small models sometimes echo the schema shape with the values tucked
  // inside "properties" — unwrap that.
  if (out && out.type === "object" && out.properties && typeof out.properties === "object") out = out.properties;
  if (!out || typeof out !== "object") return json({ error: "parse" }, 502, cors);
  return json(out, 200, cors);
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
