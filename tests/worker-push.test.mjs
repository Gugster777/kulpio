// Web-push worker tests: endpoints + the daily cron, run entirely in Node.
// A real VAPID pair is generated per run; the push service is a stub fetch
// that records requests, answers 201 for the live device and 410 for the
// dead one. No network, no Cloudflare.
import { webcrypto as wc } from 'node:crypto';
import worker from '../ai-proxy/worker.js';

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);
const post = (body, env) => worker.fetch(
  new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }), env);

// ── a stub D1 database: just enough of prepare().bind().run()/all()/first()
function stubDB() {
  const calls = [];
  const rows = { pushsubs: [] };
  return {
    calls, rows,
    prepare(sql) {
      return { bind(...args) {
        return {
          async run() { calls.push({ sql, args }); },
          async all() { calls.push({ sql, args }); return { results: rows.pushsubs }; },
          async first() { calls.push({ sql, args }); return null; },
        };
      } };
    },
  };
}

// ── endpoint behaviour
{
  let r = await post({ pushKey: 1 }, {});
  check('pushKey without secret -> empty key', (await r.json()).key === '');
  r = await post({ pushKey: 1 }, { VAPID_PUBLIC: 'PUBKEY' });
  check('pushKey returns the configured key', (await r.json()).key === 'PUBKEY');

  const db = stubDB();
  r = await post({ pushSet: { sub: { endpoint: 'https://push.example/abc' }, nextExp: 123456 } }, { DB: db });
  check('pushSet upserts endpoint + nextexp', r.status === 200
    && db.calls.length === 1 && /INSERT INTO pushsubs/.test(db.calls[0].sql)
    && db.calls[0].args[0] === 'https://push.example/abc' && db.calls[0].args[1] === 123456);
  r = await post({ pushSet: { sub: { endpoint: 'javascript:alert(1)' }, nextExp: 1 } }, { DB: db });
  check('pushSet rejects non-https endpoints', r.status === 400);
  r = await post({ pushDel: { endpoint: 'https://push.example/abc' } }, { DB: db });
  check('pushDel deletes the row', r.status === 200 && /DELETE FROM pushsubs/.test(db.calls.at(-1).sql));
  r = await post({ pushSet: { sub: {} } }, {});
  check('pushSet without DB -> 501', r.status === 501);
}

// ── household envelope (shared fridge + shopping list)
{
  const db = stubDB();
  let r = await post({ houseSet: { code: 'ABC234', uid: 'abcdef1234',
    list: { shop: [{ name: 'Milk', done: false }], fridge: [{ name: 'Cheese', exp: '2026-01-01', qty: 2 }] } } }, { DB: db });
  const stored = db.calls.at(-1).args[1];
  check('houseSet accepts the fridge envelope', r.status === 200
    && stored.includes('"fridge"') && stored.includes('Cheese') && stored.includes('Milk'));
  r = await post({ houseSet: { code: 'ABC234', uid: 'abcdef1234', list: [{ name: 'Tea', done: false }] } }, { DB: db });
  check('houseSet still accepts a legacy bare array', r.status === 200 && db.calls.at(-1).args[1].includes('Tea'));
  const huge = { shop: [], fridge: Array.from({ length: 200 }, (_, i) => ({ name: 'n' + i, a: 'x'.repeat(499), b: 'y'.repeat(499), c: 'z'.repeat(499) })) };
  r = await post({ houseSet: { code: 'ABC234', uid: 'abcdef1234', list: huge } }, { DB: db });
  check('houseSet rejects an oversized blob', r.status === 400 && (await r.json()).error === 'too big');
}

// ── the cron, end to end with a real key pair
{
  const pair = await wc.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = Buffer.from(await wc.subtle.exportKey('raw', pair.publicKey)).toString('base64url');
  const privJwk = JSON.stringify(await wc.subtle.exportKey('jwk', pair.privateKey));

  const db = stubDB();
  const soon = Date.now() + 12 * 36e5;
  db.rows.pushsubs = [
    { endpoint: 'https://push.svc/alive' },
    { endpoint: 'https://push.svc/dead' },
  ];
  const pushed = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    pushed.push({ url: String(url), headers: opts.headers });
    return new Response(null, { status: String(url).endsWith('/dead') ? 410 : 201 });
  };
  try {
    await worker.scheduled({}, { DB: db, VAPID_PUBLIC: pub, VAPID_PRIVATE_JWK: privJwk });
  } finally {
    globalThis.fetch = realFetch;
  }
  check('cron pushes every due subscription', pushed.length === 2);
  check('cron sets a TTL and vapid auth', pushed.every(p =>
    p.headers.TTL === '86400' && /^vapid t=.+, k=.+$/.test(p.headers.Authorization || '')));
  // validate the JWT: three parts, ES256 header, audience = push origin,
  // and the signature actually verifies against the public key
  const jwt = pushed[0].headers.Authorization.match(/t=([^,]+),/)[1];
  const [h, c, s] = jwt.split('.');
  const dec = part => JSON.parse(Buffer.from(part, 'base64url').toString());
  check('JWT header is ES256', dec(h).alg === 'ES256');
  const claims = dec(c);
  check('JWT audience is the push origin', claims.aud === 'https://push.svc' && claims.exp > Date.now() / 1000);
  const okSig = await wc.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey,
    Buffer.from(s, 'base64url'), new TextEncoder().encode(h + '.' + c));
  check('JWT signature verifies against the public key', okSig);
  check('cron drops the dead (410) subscription', db.calls.some(x =>
    /DELETE FROM pushsubs/.test(x.sql) && x.args[0] === 'https://push.svc/dead'));
  check('cron is a no-op without secrets', await (async () => {
    let touched = false;
    globalThis.fetch = async () => { touched = true; return new Response(null, { status: 201 }); };
    try { await worker.scheduled({}, { DB: db }); } finally { globalThis.fetch = realFetch; }
    return !touched;
  })());
}

console.log(results.join('\n'));
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
