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
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "bad json" }, 400, cors); }
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
    } else {
      return json({ error: "send name or image" }, 400, cors);
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
