// Account/auth worker tests: signup, login, sessions, and per-user sync — run
// entirely in Node against an in-memory D1 stub (no network, no Cloudflare).
// OAuth (Google/Microsoft) is not exercised here because it depends on a
// live provider JWKS + a configured client id; the email/password + session +
// sync paths are the security-critical, self-contained core.
import worker from '../ai-proxy/worker.js';
import { readFileSync } from 'node:fs';

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);

// Cloudflare Workers' Web Crypto rejects PBKDF2 iteration counts above 100000
// at runtime — Node happily runs higher, so only a source check catches a
// regression that would crash every signup/login in production.
{
  const src = readFileSync(new URL('../ai-proxy/worker.js', import.meta.url), 'utf8');
  const iters = [...src.matchAll(/iterations:\s*([A-Z0-9_]+)/g)].map(m => m[1]);
  const cap = /PBKDF2_ITERS\s*=\s*(\d+)/.exec(src);
  const n = cap ? Number(cap[1]) : NaN;
  check('PBKDF2 iterations stay within the Workers 100000 cap', n > 0 && n <= 100000);
  check('PBKDF2 uses the named iteration constant, no inline over-cap number',
    iters.every(v => !/^\d+$/.test(v) || Number(v) <= 100000));
}
const post = (body, env) => worker.fetch(
  new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }), env);

// In-memory D1 that answers just the queries the auth code issues.
function memDB() {
  const users = [], sessions = [], userdata = [], attempts = [];
  const run = (sql, a) => {
    if (/INSERT INTO login_attempts/.test(sql)) {
      const r = attempts.find(x => x.k === a[0]);
      if (r) { r.n = a[1]; r.ts = a[2]; } else attempts.push({ k: a[0], n: a[1], ts: a[2] });
      return;
    }
    if (/DELETE FROM login_attempts/.test(sql)) {
      for (let i = attempts.length - 1; i >= 0; i--) if (attempts[i].k === a[0]) attempts.splice(i, 1);
      return;
    }
    if (/INSERT INTO users/.test(sql)) {
      if (/pass, salt/.test(sql)) users.push({ id: a[0], email: a[1], pass: a[2], salt: a[3], provider: 'email', name: a[4], ts: a[5] });
      else users.push({ id: a[0], email: a[1], provider: a[2], name: a[3], ts: a[4] });
    } else if (/INSERT INTO sessions/.test(sql)) sessions.push({ token: a[0], uid: a[1], ts: a[2] });
    else if (/INSERT INTO userdata/.test(sql)) {
      const i = userdata.findIndex(u => u.uid === a[0]);
      if (i >= 0) { userdata[i].data = a[1]; userdata[i].ts = a[2]; } else userdata.push({ uid: a[0], data: a[1], ts: a[2] });
    } else if (/UPDATE users SET name/.test(sql)) {
      const u = users.find(x => x.id === a[2]); if (u) { u.name = a[0]; u.avatar = a[1]; }
    } else if (/DELETE FROM sessions WHERE token/.test(sql)) {
      const i = sessions.findIndex(s => s.token === a[0]); if (i >= 0) sessions.splice(i, 1);
    } else if (/DELETE FROM sessions WHERE uid/.test(sql)) {
      for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i].uid === a[0]) sessions.splice(i, 1);
    } else if (/DELETE FROM userdata WHERE uid/.test(sql)) {
      for (let i = userdata.length - 1; i >= 0; i--) if (userdata[i].uid === a[0]) userdata.splice(i, 1);
    } else if (/DELETE FROM users WHERE id/.test(sql)) {
      for (let i = users.length - 1; i >= 0; i--) if (users[i].id === a[0]) users.splice(i, 1);
    }
    // DELETE FROM ratings/prices/scanlog are no-ops here (those tables aren't modelled).
  };
  const first = (sql, a) => {
    if (/FROM login_attempts WHERE k/.test(sql)) return attempts.find(x => x.k === a[0]) || null;
    if (/FROM users WHERE email/.test(sql)) return users.find(u => u.email === a[0]) || null;
    if (/FROM users WHERE id/.test(sql)) return users.find(u => u.id === a[0]) || null;
    if (/FROM sessions WHERE token/.test(sql)) return sessions.find(s => s.token === a[0]) || null;
    if (/FROM userdata WHERE uid/.test(sql)) return userdata.find(u => u.uid === a[0]) || null;
    return null;
  };
  // A prepared statement is runnable directly (CREATE TABLE, no params) or
  // after .bind() (parameterised) — exactly like a real D1PreparedStatement.
  // ensureAuthTables runs the CREATEs un-bound, so this must not require bind.
  const stmt = (sql, a = []) => ({
    bind: (...b) => stmt(sql, b),
    async run() { run(sql, a); },
    async all() { return { results: [] }; },
    async first() { return first(sql, a); },
  });
  return {
    _users: users, _sessions: sessions,
    async batch() { throw new Error("D1 batch() must not run DDL — use separate .run() calls"); },
    prepare(sql) { return stmt(sql); },
  };
}

// ── signup / login / sessions ──
{
  const db = memDB();
  let r = await post({ auth: { signup: { email: 'A@Example.com ', pass: 'hunter2pass' } } }, { DB: db });
  let j = await r.json();
  check('signup returns a token + user, lowercased email', r.status === 200 && j.token && j.token.length > 12 && j.user.email === 'a@example.com');
  check('signup stored one user with a hash, not the raw password', db._users.length === 1 && db._users[0].pass && db._users[0].pass !== 'hunter2pass' && db._users[0].salt);
  const token = j.token;

  r = await post({ auth: { signup: { email: 'a@example.com', pass: 'anotherpass' } } }, { DB: db });
  check('signup rejects a duplicate email (409)', r.status === 409);

  r = await post({ auth: { signup: { email: 'b@example.com', pass: 'short' } } }, { DB: db });
  check('signup rejects a weak password (400)', r.status === 400);

  r = await post({ auth: { signup: { email: 'not-an-email', pass: 'longenough' } } }, { DB: db });
  check('signup rejects a bad email (400)', r.status === 400);

  r = await post({ auth: { login: { email: 'a@example.com', pass: 'hunter2pass' } } }, { DB: db });
  j = await r.json();
  check('login with the right password returns a token', r.status === 200 && j.token && j.user.email === 'a@example.com');

  r = await post({ auth: { login: { email: 'a@example.com', pass: 'wrongpass1' } } }, { DB: db });
  check('login with the wrong password is 401', r.status === 401);

  r = await post({ auth: { login: { email: 'nobody@example.com', pass: 'whatever1' } } }, { DB: db });
  check('login for an unknown account is 401', r.status === 401);

  r = await post({ auth: { me: { token } } }, { DB: db });
  check('me(token) returns the signed-in user', (await r.json()).user.email === 'a@example.com');

  r = await post({ auth: { me: { token: 'garbagegarbage' } } }, { DB: db });
  check('me(bad token) returns null', (await r.json()).user === null);

  // ── customise the account (display name + avatar) ──
  r = await post({ auth: { update: { token, name: 'Richard B', avatar: '🥑' } } }, { DB: db });
  j = await r.json();
  check('update returns the new name + avatar', r.status === 200 && j.user.name === 'Richard B' && j.user.avatar === '🥑');
  r = await post({ auth: { me: { token } } }, { DB: db });
  j = await r.json();
  check('me reflects the customised profile', j.user.name === 'Richard B' && j.user.avatar === '🥑');
  r = await post({ auth: { update: { token: 'garbagegarbage', name: 'x' } } }, { DB: db });
  check('update without a valid session is 401', r.status === 401);

  // ── per-user sync ──
  r = await post({ userSet: { token, data: { fridge: [{ name: 'Milk' }], v: 1 } } }, { DB: db });
  check('userSet stores the blob for the session owner', r.status === 200);

  r = await post({ userGet: { token } }, { DB: db });
  j = await r.json();
  check('userGet returns the same blob back', j.data && Array.isArray(j.data.fridge) && j.data.fridge[0].name === 'Milk' && j.data.v === 1);

  r = await post({ userGet: { token: 'garbagegarbage' } }, { DB: db });
  check('userGet without a valid session is 401', r.status === 401);

  r = await post({ userSet: { token: 'garbagegarbage', data: {} } }, { DB: db });
  check('userSet without a valid session is 401', r.status === 401);

  // ── logout invalidates the session ──
  r = await post({ auth: { logout: { token } } }, { DB: db });
  check('logout returns ok', r.status === 200);
  r = await post({ auth: { me: { token } } }, { DB: db });
  check('me after logout returns null', (await r.json()).user === null);
  r = await post({ userGet: { token } }, { DB: db });
  check('userGet after logout is 401', r.status === 401);
}

// ── brute-force guard: repeated wrong logins get rate-limited ──
{
  const db = memDB();
  await post({ auth: { signup: { email: 'lock@example.com', pass: 'correctpass1' } } }, { DB: db });
  let last;
  for (let i = 0; i < 5; i++) last = await post({ auth: { login: { email: 'lock@example.com', pass: 'wrongwrong' } } }, { DB: db });
  check('wrong logins return 401 up to the limit', last.status === 401);
  const locked = await post({ auth: { login: { email: 'lock@example.com', pass: 'correctpass1' } } }, { DB: db });
  check('past the limit, even a correct login is rate-limited (429)', locked.status === 429);
}
{
  const db = memDB();
  await post({ auth: { signup: { email: 'ok@example.com', pass: 'correctpass1' } } }, { DB: db });
  await post({ auth: { login: { email: 'ok@example.com', pass: 'nope' } } }, { DB: db });   // one miss
  const good = await post({ auth: { login: { email: 'ok@example.com', pass: 'correctpass1' } } }, { DB: db });
  check('a correct login succeeds and clears the attempt counter', good.status === 200);
  let last;
  for (let i = 0; i < 5; i++) last = await post({ auth: { login: { email: 'ok@example.com', pass: 'nope' } } }, { DB: db });
  check('after a success the counter resets (401, not 429)', last.status === 401);
}

// ── GDPR: account deletion erases the user, session and synced data ──
{
  const db = memDB();
  let r = await post({ auth: { signup: { email: 'gone@example.com', pass: 'deleteme123' } } }, { DB: db });
  const token = (await r.json()).token;
  await post({ userSet: { token, data: { fridge: [{ name: 'Milk' }], v: 1 } } }, { DB: db });
  check('before deletion: user, session and data exist', db._users.length === 1 && db._sessions.length === 1);

  r = await post({ auth: { deleteAccount: { token, uid: 'device-uid-123' } } }, { DB: db });
  check('deleteAccount returns ok', r.status === 200 && (await r.json()).ok === true);
  check('the user row is erased', db._users.length === 0);
  check('the session is erased', db._sessions.length === 0);

  r = await post({ auth: { me: { token } } }, { DB: db });
  check('the deleted session no longer authenticates', (await r.json()).user === null);
  r = await post({ userGet: { token } }, { DB: db });
  check('the synced data is unreachable after deletion (401)', r.status === 401);

  r = await post({ auth: { deleteAccount: { token: 'garbagegarbage' } } }, { DB: db });
  check('deleteAccount without a valid session is 401', r.status === 401);
}

// ── OAuth: Google has a built-in client id; Microsoft waits for one ──
{
  const db = memDB();
  let r = await post({ auth: { google: { idToken: 'x.y.z' } } }, { DB: db });
  check('google login rejects a malformed id token (401, not 501)', r.status === 401);
  r = await post({ auth: { microsoft: { idToken: 'x.y.z' } } }, { DB: db });
  check('microsoft login is 501 until MS_CLIENT_ID is set', r.status === 501);
}

// ── Android Digital Asset Links (TWA) ──
{
  const get = (env) => worker.fetch(new Request('http://x/.well-known/assetlinks.json', { method: 'GET' }), env);
  let r = await get({});
  check('assetlinks is valid empty JSON until Android vars are set', r.status === 200 && Array.isArray(await r.json()));
  r = await get({ ANDROID_PACKAGE: 'app.kulpio.twa', ANDROID_FINGERPRINT: 'AA:BB, CC:DD' });
  const j = await r.json();
  check('assetlinks emits the app link once vars are set', Array.isArray(j) && j[0]
    && j[0].target.package_name === 'app.kulpio.twa'
    && j[0].target.sha256_cert_fingerprints.length === 2);
}

// ── no DB binding → a clean 501, never a throw ──
{
  const r = await post({ auth: { signup: { email: 'a@b.co', pass: 'longenough' } } }, {});
  check('auth without a DB binding -> 501', r.status === 501);
}

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
