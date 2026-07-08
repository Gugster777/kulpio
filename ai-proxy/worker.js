/*
 * Kulpio AI proxy — Cloudflare Worker
 * ------------------------------------
 * Holds your Anthropic API key (NEVER put a key in the app's HTML) and answers
 * two kinds of request from kulpio_app.html:
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
 * Deploy: see ai-proxy/README.md. Set the secret ANTHROPIC_API_KEY.
 */

const MODEL = "claude-haiku-4-5"; // fast + low-cost; swap to "claude-opus-4-8" for max quality
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

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
      // All-in-one deploy (root wrangler.toml): static assets are served
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
      // Real web image search (DuckDuckGo Images). No Anthropic call — the
      // Worker just does the CORS-free fetching a browser page can't.
      return imageSearch(String(body.imageSearch).slice(0, 100), cors);
    }

    if (!env.ANTHROPIC_API_KEY) return json({ error: "no key configured" }, 500, cors);

    const today = new Date().toISOString().slice(0, 10);
    let payload;

    if (body.image) {
      // Vision: read product + printed best-before date off a photo.
      payload = {
        model: MODEL,
        max_tokens: 300,
        output_config: {
          format: {
            type: "json_schema",
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
          },
        },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mediaType || "image/jpeg", data: body.image } },
            { type: "text", text: `Today is ${today}. Identify this grocery product and read any printed "best before"/"use by"/expiry date. Reply with the product name, bestBefore (YYYY-MM-DD if a date is visible, otherwise omit), and days (your estimate of days from today until it spoils if no date is printed).` },
          ],
        }],
      };
    } else if (body.name) {
      // Text: estimate shelf life from a product name.
      payload = {
        model: MODEL,
        max_tokens: 100,
        output_config: {
          format: {
            type: "json_schema",
            schema: {
              type: "object",
              properties: { days: { type: "integer", description: "typical days until it spoils, stored normally" } },
              required: ["days"],
              additionalProperties: false,
            },
          },
        },
        messages: [{ role: "user", content: `Estimate the typical number of days until this grocery item is no longer good to eat, freshly bought and stored normally (fridge or pantry as appropriate): "${body.name}". Return only the day count.` }],
      };
    } else if (body.nutrition && body.nutrition.title) {
      // Nutrition: estimate БЖУ per serving from the recipe's ingredient list.
      const n = body.nutrition;
      const ings = (Array.isArray(n.ingredients) ? n.ingredients : []).slice(0, 30).join("; ");
      payload = {
        model: MODEL,
        max_tokens: 200,
        output_config: {
          format: {
            type: "json_schema",
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
          },
        },
        messages: [{ role: "user", content: `Estimate the nutrition PER SERVING of this recipe.\nTitle: ${String(n.title).slice(0, 200)}\nIngredients: ${ings}\nAssume the recipe serves a typical number of people for a dish of this kind. Return kcal, protein, fat and carbs (grams) per serving.` }],
      };
    } else {
      return json({ error: "send name, image or nutrition" }, 400, cors);
    }

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
  },
};

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
