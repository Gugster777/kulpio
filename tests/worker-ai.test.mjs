// AI endpoint guard tests. The limiter is intentionally in-memory because it
// is a first-line isolate guard; Cloudflare's edge may use several isolates.
import worker from '../ai-proxy/worker.js';

const check = (name, ok) => {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
  if (!ok) process.exitCode = 1;
};

const ai = { run: async () => ({ response: JSON.stringify({ days: 7 }) }) };
const post = (body, ip) => worker.fetch(
  new Request('https://kulpio.test/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify(body),
  }),
  { AI: ai },
);

const ip = 'ai-limit-test-' + Date.now();
let last;
for (let i = 0; i < 40; i++) last = await post({ name: 'milk' }, ip);
check('AI requests within the budget succeed', last.status === 200);

last = await post({ name: 'milk' }, ip);
const limited = await last.json();
check('AI requests over the budget return 429', last.status === 429 && limited.error === 'ai rate limit');
check('rate limit includes Retry-After', Number(last.headers.get('Retry-After')) > 0);

process.exit(process.exitCode || 0);
