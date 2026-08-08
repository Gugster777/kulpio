// Cloudflare edge cache wrapper for Kulpio's AI proxy.
// Keeps deterministic AI responses out of the Worker/AI budget when the same
// request is repeated by another session or device in the same edge cache.
import worker from './translation-worker.js';

const CACHE_VERSION = 'v2';
const CACHE_TTL = 6 * 60 * 60; // 6 hours; short enough for prompt/model changes.
const CACHEABLE_KEYS = new Set([
  'name', 'brands', 'nutrition', 'chef', 'verdict', 'translate',
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonicalize(value[k])]));
  }
  return value;
}

async function cacheKey(request, body) {
  const canonical = JSON.stringify({ version: CACHE_VERSION, body: canonicalize(body) });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  return new Request(new URL(`/__kulpio-ai-cache/${hex}`, request.url).toString(), { method: 'GET' });
}

function isCacheable(body) {
  if (!body || typeof body !== 'object') return false;
  // Vision requests contain private/user-provided images and are deliberately
  // excluded. They are also much larger than the useful cache payload.
  if (body.image || body.receipt || body.imageSearch) return false;
  // Never cache writes, auth/session operations, community events, or OFF calls.
  if (body.offProduct || body.offWrite || body.scanLog || body.rateLog || body.rateGet) return false;
  return Object.keys(body).some(k => CACHEABLE_KEYS.has(k));
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') return worker.fetch(request, env, ctx);

    let body;
    try {
      body = await request.clone().json();
    } catch {
      return worker.fetch(request, env, ctx);
    }

    if (!isCacheable(body)) return worker.fetch(request, env, ctx);

    const key = await cacheKey(request, body);
    const cache = caches.default;
    const hit = await cache.match(key);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set('X-Kulpio-AI-Cache', 'HIT');
      headers.set('Cache-Control', 'no-store');
      return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
    }

    const response = await worker.fetch(request, env, ctx);
    if (response.ok) {
      const cacheHeaders = new Headers(response.headers);
      cacheHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL}`);
      cacheHeaders.set('X-Kulpio-AI-Cache', 'MISS');
      const cached = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: cacheHeaders,
      });
      ctx.waitUntil(cache.put(key, cached));

      const clientHeaders = new Headers(response.headers);
      clientHeaders.set('X-Kulpio-AI-Cache', 'MISS');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: clientHeaders,
      });
    }
    return response;
  },

  scheduled(...args) {
    if (typeof worker.scheduled === 'function') return worker.scheduled(...args);
  },
};
