// Shared-fridge worker tests: the household blob keeps shop + fridge as
// whole-state last-write-wins, but MEMBERS and ACTIVITY must be merged
// server-side so two phones don't clobber each other. Runs in Node against a
// tiny in-memory D1 stub — no network, no Cloudflare.
import worker from '../ai-proxy/worker.js';

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);

const post = (body, env) => worker.fetch(
  new Request('http://x/api', { method: 'POST', body: JSON.stringify(body) }), env);

// In-memory D1 covering just the `households` table the code touches.
function memDB() {
  const rows = new Map();   // code -> { list, ts }
  const stmt = (sql, a = []) => ({
    bind: (...b) => stmt(sql, b),
    first: async () => {
      if (/FROM households WHERE code/.test(sql)) return rows.get(a[0]) || null;
      return null;
    },
    run: async () => {
      if (/INSERT INTO households/.test(sql)) rows.set(a[0], { list: a[1], ts: a[2] });
      return { success: true };
    },
  });
  return { prepare: (sql) => stmt(sql), _rows: rows };
}

const CODE = 'ABC234';
const uidA = 'uid-aaaa-1111';
const uidB = 'uid-bbbb-2222';

const run = async () => {
  const env = { DB: memDB() };

  // Device A joins: pushes its (empty) fridge, announces itself, logs one add.
  const rA = await (await post({ houseSet: { code: CODE, uid: uidA, list: { shop: [{ name: 'Bread', done: false }], fridge: [] },
    member: { name: 'Ann', avatar: '🍐' }, events: [{ id: 'e1', kind: 'add', name: 'Milk', ts: 1000 }] } }, env)).json();
  check('device A push accepted', rA && rA.ok === true);

  // Device B joins with a DIFFERENT view: its push must not wipe A's membership
  // or A's activity — the server merges them.
  await (await post({ houseSet: { code: CODE, uid: uidB, list: { shop: [{ name: 'Bread', done: false }], fridge: [] },
    member: { name: 'Bob', avatar: '🐼' }, events: [{ id: 'e2', kind: 'used', name: 'Eggs', ts: 2000 }] } }, env)).json();

  const g1 = await (await post({ houseGet: { code: CODE } }, env)).json();
  const members = (g1.list && g1.list.members) || {};
  const activity = (g1.list && g1.list.activity) || [];
  check('both members survive the other\'s push', !!members[uidA] && !!members[uidB]);
  check('member names + avatars stored', members[uidA].name === 'Ann' && members[uidB].avatar === '🐼');
  check('activity from both members is merged', activity.some(a => a.id === 'e1') && activity.some(a => a.id === 'e2'));
  check('newest activity comes first', activity[0].id === 'e2');
  check('each event is stamped with its author uid', activity.find(a => a.id === 'e1').uid === uidA);

  // A re-push of an already-seen event id must not duplicate it.
  await (await post({ houseSet: { code: CODE, uid: uidA, list: { shop: [], fridge: [] },
    events: [{ id: 'e1', kind: 'add', name: 'Milk', ts: 1000 }] } }, env)).json();
  const g2 = await (await post({ houseGet: { code: CODE } }, env)).json();
  const acts2 = (g2.list && g2.list.activity) || [];
  check('duplicate event ids are deduped', acts2.filter(a => a.id === 'e1').length === 1);

  // The fridge/shop still follow last-write-wins.
  await (await post({ houseSet: { code: CODE, uid: uidB, list: { shop: [{ name: 'Coffee', done: false }], fridge: [] } } }, env)).json();
  const g3 = await (await post({ houseGet: { code: CODE } }, env)).json();
  check('shop stays last-write-wins', g3.list.shop.length === 1 && g3.list.shop[0].name === 'Coffee');
  check('members persist across a list-only push', !!g3.list.members[uidA] && !!g3.list.members[uidB]);

  // Chat messages merge just like activity — both members' lines survive.
  await (await post({ houseSet: { code: CODE, uid: uidA, list: { shop: [], fridge: [] },
    messages: [{ id: 'm1', name: 'Ann', text: 'we are out of milk', ts: 5000 }] } }, env)).json();
  await (await post({ houseSet: { code: CODE, uid: uidB, list: { shop: [], fridge: [] },
    messages: [{ id: 'm2', name: 'Bob', text: 'grabbing some now', ts: 6000 }] } }, env)).json();
  const gc = await (await post({ houseGet: { code: CODE } }, env)).json();
  const msgs = (gc.list && gc.list.messages) || [];
  check('chat from both members is merged', msgs.some(m => m.id === 'm1') && msgs.some(m => m.id === 'm2'));
  check('chat is ordered oldest→newest', msgs[msgs.length - 1].id === 'm2');
  check('chat carries author uid + text', msgs.find(m => m.id === 'm1').uid === uidA && msgs.find(m => m.id === 'm1').text.includes('milk'));
  await (await post({ houseSet: { code: CODE, uid: uidA, list: { shop: [], fridge: [] },
    messages: [{ id: 'm1', name: 'Ann', text: 'we are out of milk', ts: 5000 }] } }, env)).json();
  const gc2 = await (await post({ houseGet: { code: CODE } }, env)).json();
  check('duplicate message ids are deduped', (gc2.list.messages || []).filter(m => m.id === 'm1').length === 1);
  check('an empty message is dropped', !(gc2.list.messages || []).some(m => m.text === ''));

  // A bad uid is rejected (membership is the code, but a uid is still required).
  const bad = await post({ houseSet: { code: CODE, uid: 'short', list: { shop: [], fridge: [] } } }, env);
  check('a too-short uid is rejected', bad.status === 400);

  console.log(results.join('\n'));
  if (results.some(r => r.startsWith('FAIL'))) process.exit(1);
};
run();
