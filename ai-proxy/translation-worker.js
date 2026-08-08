// Translation-quality layer for the 16 maintained Kulpio languages.
// It sits in front of worker.js so translation can use a tighter language
// policy and a dedicated culinary prompt without changing the other AI tasks.
import worker from './worker.js';

export const SUPPORTED_TRANSLATION_LANGS = Object.freeze({
  en: 'English', ru: 'Russian', ro: 'Romanian', de: 'German', fr: 'French',
  es: 'Spanish', it: 'Italian', pt: 'Portuguese', pl: 'Polish', tr: 'Turkish',
  ar: 'Arabic', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean',
  hi: 'Hindi', uk: 'Ukrainian',
});

const CF_TEXT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TEXTS = 60;
const MAX_TEXT_LENGTH = 600;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_UNITS = 40;
const rate = new Map();

const LANGUAGE_STYLE = Object.freeze({
  en: 'Use natural modern English cookbook wording.',
  ru: 'Use natural modern Russian culinary wording; prefer established food terms and grammatical case agreement.',
  ro: 'Use natural Romanian used in cookbooks; avoid literal English calques and preserve diacritics.',
  de: 'Use natural German food terminology and correct adjective/noun agreement; prefer normal German compounds.',
  fr: 'Use idiomatic French culinary terminology and natural article/gender agreement.',
  es: 'Use idiomatic Spanish food terminology and natural gender/number agreement.',
  it: 'Use idiomatic Italian culinary terminology; preserve natural ingredient names and gender/number agreement.',
  pt: 'Use natural European/neutral Portuguese culinary wording; preserve accents and avoid Brazilian-only slang when unnecessary.',
  pl: 'Use natural Polish culinary terminology with correct grammatical cases and inflection.',
  tr: 'Use natural Turkish food terminology and normal Turkish word order; do not transliterate English food words.',
  ar: 'Use clear Modern Standard Arabic culinary wording, with natural food terminology and Arabic script.',
  zh: 'Use Simplified Chinese food terminology; translate meaning rather than transliterating English ingredient names.',
  ja: 'Use natural Japanese cookbook wording; use established katakana only for genuine loanwords and never for ordinary translatable food terms.',
  ko: 'Use natural Korean cookbook wording and established food terminology; avoid unnecessary transliteration.',
  hi: 'Use natural Hindi cookbook wording in Devanagari; use familiar food terminology rather than awkward transliteration.',
  uk: 'Use natural Ukrainian culinary wording with correct cases and Ukrainian vocabulary; do not replace Ukrainian with Russian.',
});

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

function corsHeaders(request, env) {
  const requestUrl = new URL(request.url);
  const configured = String(env.ALLOWED_ORIGIN || '').trim().replace(/\/+$/, '');
  const origin = configured && configured !== '*' ? configured : requestUrl.origin;
  const requestOrigin = request.headers.get('Origin');
  return {
    origin,
    allowed: !requestOrigin || requestOrigin === origin,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    },
  };
}

function checkRate(request) {
  const ip = request.headers.get('CF-Connecting-IP') || (request.headers.get('X-Forwarded-For') || '').split(',')[0].trim() || 'anonymous';
  const now = Date.now();
  if (rate.size > 2000) for (const [key, row] of rate) if (now - row.ts >= WINDOW_MS) rate.delete(key);
  const old = rate.get(ip);
  const row = old && now - old.ts < WINDOW_MS ? old : { units: 0, ts: now };
  if (row.units + 2 > MAX_UNITS) return Math.max(1, Math.ceil((WINDOW_MS - (now - row.ts)) / 1000));
  row.units += 2;
  rate.set(ip, row);
  return 0;
}

function parseModelJson(value) {
  if (value && typeof value === 'object') return value;
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf('{'), end = text.lastIndexOf('}');
  if (start >= 0 && end > start) try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  return null;
}

export function buildTranslationPrompt(langCode, texts) {
  const langName = SUPPORTED_TRANSLATION_LANGS[langCode];
  if (!langName) throw new Error('unsupported language');
  return [
    `Translate these English food/recipe strings into ${langName}.`,
    LANGUAGE_STYLE[langCode],
    'Act as a professional native-speaking food editor, not a literal machine translator.',
    'Preserve the exact meaning, every descriptor, quantity, unit, temperature, time, ingredient, and cooking action.',
    'Do not omit, invent, summarize, reorder, or merge items. Return exactly the same number of strings in the same order.',
    'Translate culinary meaning rather than English spelling. Never transliterate an ordinary translatable ingredient.',
    'Keep brand names, product names, measurements, numbers, and standard abbreviations when they should remain unchanged.',
    'Preserve diacritics and the target language script. Do not mix languages unless a brand or genuinely universal term requires it.',
    'Use established local food terminology and natural grammar. Avoid calques, false friends, awkward word-for-word phrasing, and unnecessary English loanwords.',
    'For ambiguous culinary terms, choose the meaning used in a recipe, not a business/technical meaning. For example, English “stock” means cooking broth, not inventory.',
    'Return JSON only in the form {"texts":["translation 1","translation 2",...]} with no markdown or commentary.',
    `Input JSON: ${JSON.stringify(texts)}`,
  ].join('\n');
}

async function translateWithAnthropic(env, prompt, maxTokens) {
  if (!env.ANTHROPIC_API_KEY) return null;
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': String(env.ANTHROPIC_API_KEY), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL, max_tokens: maxTokens, temperature: 0.15,
      system: 'You are Kulpio’s professional culinary translation editor. Accuracy and natural native wording are more important than literal correspondence.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.content?.find(part => part.type === 'text')?.text || null;
}

async function translateWithCloudflare(env, prompt, maxTokens) {
  if (!env.AI) return null;
  const result = await env.AI.run(CF_TEXT_MODEL, {
    messages: [
      { role: 'system', content: 'You are Kulpio’s professional culinary translation editor. Output valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: maxTokens,
    temperature: 0.15,
  });
  return result?.response || result;
}

async function handleTranslation(request, env, body, cors) {
  const input = body.translate || {};
  const lang = String(input.lang || '').toLowerCase();
  if (!SUPPORTED_TRANSLATION_LANGS[lang]) return json({ error: 'bad lang' }, 400, cors);
  let texts = Array.isArray(input.texts) ? input.texts.map(text => String(text ?? '').slice(0, MAX_TEXT_LENGTH)) : [];
  texts = texts.slice(0, MAX_TEXTS);
  if (!texts.length) return json({ error: 'no texts' }, 400, cors);
  const retryAfter = checkRate(request);
  if (retryAfter) return json({ error: 'ai rate limit', retryAfter }, 429, { ...cors, 'Retry-After': String(retryAfter) });

  const prompt = buildTranslationPrompt(lang, texts);
  const maxTokens = Math.min(6000, 500 + texts.reduce((sum, text) => sum + text.length, 0));
  let raw = null;
  try { raw = await translateWithAnthropic(env, prompt, maxTokens); } catch {}
  if (!raw) try { raw = await translateWithCloudflare(env, prompt, maxTokens); } catch {}

  const parsed = parseModelJson(raw);
  const out = parsed?.texts;
  if (!Array.isArray(out) || out.length !== texts.length || out.some(text => typeof text !== 'string')) return json({ error: 'translation failed' }, 502, cors);
  return json({ texts: out.map(text => text.trim()) }, 200, cors);
}

export default {
  async fetch(request, env, ctx) {
    const cors = corsHeaders(request, env);
    if (!cors.allowed) return json({ error: 'origin not allowed' }, 403, cors.headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
    if (request.method !== 'POST') return worker.fetch(request, env, ctx);
    let body;
    try { body = await request.clone().json(); } catch { return worker.fetch(request, env, ctx); }
    if (!body || !body.translate) return worker.fetch(request, env, ctx);
    return handleTranslation(request, env, body, cors.headers);
  },
  scheduled(...args) {
    if (typeof worker.scheduled === 'function') return worker.scheduled(...args);
  },
};
