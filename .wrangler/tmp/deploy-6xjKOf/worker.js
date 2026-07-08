var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ai-proxy/worker.js
var MODEL = "claude-haiku-4-5";
var ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
var worker_default = {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") {
      if (request.method === "GET" && env.ASSETS) {
        return Response.redirect(new URL("/kulpio_app.html", request.url), 302);
      }
      return json({ error: "POST only" }, 405, cors);
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad json" }, 400, cors);
    }
    if (body.imageSearch) {
      return imageSearch(String(body.imageSearch).slice(0, 100), cors);
    }
    if (!env.ANTHROPIC_API_KEY) return json({ error: "no key configured" }, 500, cors);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    let payload;
    if (body.image) {
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
                days: { type: "integer", description: "estimated days from today until it goes bad if no date is printed" }
              },
              required: ["name", "days"],
              additionalProperties: false
            }
          }
        },
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: body.mediaType || "image/jpeg", data: body.image } },
            { type: "text", text: `Today is ${today}. Identify this grocery product and read any printed "best before"/"use by"/expiry date. Reply with the product name, bestBefore (YYYY-MM-DD if a date is visible, otherwise omit), and days (your estimate of days from today until it spoils if no date is printed).` }
          ]
        }]
      };
    } else if (body.name) {
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
              additionalProperties: false
            }
          }
        },
        messages: [{ role: "user", content: `Estimate the typical number of days until this grocery item is no longer good to eat, freshly bought and stored normally (fridge or pantry as appropriate): "${body.name}". Return only the day count.` }]
      };
    } else if (body.nutrition && body.nutrition.title) {
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
                carbs: { type: "number", description: "carbohydrate grams per serving" }
              },
              required: ["kcal", "protein", "fat", "carbs"],
              additionalProperties: false
            }
          }
        },
        messages: [{ role: "user", content: `Estimate the nutrition PER SERVING of this recipe.
Title: ${String(n.title).slice(0, 200)}
Ingredients: ${ings}
Assume the recipe serves a typical number of people for a dish of this kind. Return kcal, protein, fat and carbs (grams) per serving.` }]
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
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(payload)
      });
    } catch {
      return json({ error: "upstream unreachable" }, 502, cors);
    }
    if (!res.ok) return json({ error: "upstream " + res.status }, 502, cors);
    const data = await res.json();
    const block = (data.content || []).find((b) => b.type === "text");
    if (!block) return json({ error: "no output" }, 502, cors);
    let out;
    try {
      out = JSON.parse(block.text);
    } catch {
      return json({ error: "parse" }, 502, cors);
    }
    return json(out, 200, cors);
  }
};
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...cors }
  });
}
__name(json, "json");
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
async function imageSearch(q, cors) {
  try {
    const page = await fetch(
      "https://duckduckgo.com/?q=" + encodeURIComponent(q) + "&iax=images&ia=images",
      { headers: { "user-agent": UA } }
    ).then((r) => r.text());
    const vqd = (page.match(/vqd=["']?([\d-]+)["']?/) || [])[1];
    if (!vqd) return json({ url: "" }, 200, cors);
    const res = await fetch(
      "https://duckduckgo.com/i.js?l=us-en&o=json&q=" + encodeURIComponent(q) + "&vqd=" + vqd,
      { headers: { "user-agent": UA, referer: "https://duckduckgo.com/" } }
    );
    if (!res.ok) return json({ url: "" }, 200, cors);
    const data = await res.json();
    const hit = (data.results || [])[0];
    return json({ url: hit ? hit.thumbnail || hit.image || "" : "" }, 200, cors);
  } catch {
    return json({ url: "" }, 200, cors);
  }
}
__name(imageSearch, "imageSearch");
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
