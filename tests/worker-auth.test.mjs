// Account/auth worker tests: signup, login, sessions, and per-user sync — run
// entirely in Node against an in-memory D1 stub (no network, no Cloudflare).
// OAuth (Google/Microsoft) is not exercised here because it depends on a
// live provider JWKS + a configured client id; the email/password + session +
// sync paths are the security-critical, self-contained core.
import worker from '../ai-proxy/worker.js';

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);
const post = (body, env) => worker.fetch(
  new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }), env);

// In-memory D1 that answers just the queries the auth code issues.
function memDB() {
  const users = [], sessions = [], userdata = [];
  const run = (sql, a) => {
    if (/INSERT INTO users/.test(sql)) {
      if (/pass, salt/.test(sql)) users.push({ id: a[0], email: a[1], pass: a[2], salt: a[3], provider: 'email', name: a[4], ts: a[5] });
      else users.push({ id: a[0], email: a[1], provider: a[2], name: a[3], ts: a[4] });
    } else if (/INSERT INTO sessions/.test(sql)) sessions.push({ token: a[0], uid: a[1], ts: a[2] });
    else if (/INSERT INTO userdata/.test(sql)) {
      const i = userdata.findIndex(u => u.uid === a[0]);
      if (i >= 0) { userdata[i].data = a[1]; userdata[i].ts = a[2]; } else userdata.push({ uid: a[0], data: a[1], ts: a[2] });
    } else if (/UPDATE users SET name/.test(sql)) {
      const u = users.find(x => x.id === a[2]); if (u) { u.name = a[0]; u.avatar = a[1]; }
    } else if (/DELETE FROM sessions/.test(sql)) {
      const i = sessions.findIndex(s => s.token === a[0]); if (i >= 0) sessions.splice(i, 1);
    }
  };
  const first = (sql, a) => {
    if (/FROM users WHERE email/.test(sql)) return users.find(u => u.email === a[0]) || null;
    if (/FROM users WHERE id/.test(sql)) return users.find(u => u.id === a[0]) || null;
    if (/FROM sessions WHERE token/.test(sql)) return sessions.find(s => s.token === a[0]) || null;
    if (/FROM userdata WHERE uid/.test(sql)) return userdata.find(u => u.uid === a[0]) || null;
    return null;
  };
  return {
    _users: users, _sessions: sessions,
    async batch() { return []; },   // CREATE TABLE IF NOT EXISTS — no-op here
    prepare(sql) { return { bind(...a) { return {
      async run() { run(sql, a); },
      async all() { return { results: [] }; },
      async first() { return first(sql, a); },
    }; } }; },
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
