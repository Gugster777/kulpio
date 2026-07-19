// Structure guard-rails for the single-file app. No browser, pure text
// checks — they catch the classes of mistake a 12k-line HTML file invites:
// a reused translation-table number silently clobbering another, a table
// added without its merge loop, a leftover merge-conflict marker, or a
// service-worker cache name that isn't a bumpable kulpio-vNNN.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'kulpio_app.html'), 'utf8');
const sw = readFileSync(join(root, 'service-worker.js'), 'utf8');
const results = [];
const check = (name, ok, detail = '') => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name + (ok || !detail ? '' : ' — ' + detail));

// 1. No two translation tables share a number (a reuse silently overwrites).
const tableNums = [...app.matchAll(/\bconst (L\d+) = \{/g)].map(m => m[1]);
const dupTables = tableNums.filter((t, i) => tableNums.indexOf(t) !== i);
check('no duplicate translation-table names', dupTables.length === 0, 'dupes: ' + [...new Set(dupTables)].join(', '));

// 2. Every LNN table is merged into L with its own loop (else it's dead).
const merged = new Set([...app.matchAll(/for \(const \w+ in (L\d+)\)/g)].map(m => m[1]));
const orphans = [...new Set(tableNums)].filter(t => !merged.has(t));
check('every translation table is merged into L', orphans.length === 0, 'orphans: ' + orphans.join(', '));

// 3. No leftover merge-conflict markers in shipped files.
const conflict = /^(<<<<<<<|=======|>>>>>>>)/m;
check('no conflict markers in the app', !conflict.test(app));
check('no conflict markers in the service worker', !conflict.test(sw));

// 4. The service-worker cache name is a bumpable kulpio-vNNN.
const cache = (sw.match(/CACHE_NAME\s*=\s*"(kulpio-v\d+)"/) || [])[1];
check('service worker has a versioned cache name', !!cache, 'got: ' + cache);

// 5. Every L69/L70-style table row is a language:{...} — a stray key at the
//    top level (missing lang prefix) would land in no locale. Spot-check that
//    each table's first entry looks like `xx:{`.
const badTables = tableNums.filter(t => {
  const m = app.match(new RegExp('const ' + t + ' = \\{\\s*([a-z]{2,3}):\\{'));
  return !m;
});
check('translation tables start with a language key', badTables.length === 0, badTables.join(', '));

// 6. Manifest app-shortcuts point at ?do= launch params the app handles.
const manifest = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
const shortcuts = manifest.shortcuts || [];
check('manifest declares app shortcuts', shortcuts.length >= 1);
const doActs = shortcuts.map(s => (s.url.match(/[?]do=([a-z]+)/) || [])[1]).filter(Boolean);
check('every shortcut carries a ?do= action', doActs.length === shortcuts.length, 'urls: ' + shortcuts.map(s => s.url).join(', '));
check('the app handles each shortcut action', doActs.every(a => app.includes(`_shortcutAct === '${a}'`)), 'unhandled: ' + doActs.join(', '));
check('shortcut icons are precached in the SW', shortcuts.every(s => (s.icons || []).every(ic => sw.includes(ic.src))));

console.log(results.join('\n'));
process.exit(results.some(r => r.startsWith('FAIL')) ? 1 : 0);
