// Runtime/launch checks for the public Worker surface.
import worker from '../ai-proxy/worker.js';

const results = [];
const check = (name, ok) => results.push((ok ? 'PASS' : 'FAIL') + '  ' + name);

let r = await worker.fetch(new Request('https://kulpio.test/healthz'), {});
const health = await r.json();
check('health endpoint reports a live Worker', r.status === 200 && health.ok === true && health.service === 'kulpio');
check('health endpoint exposes the release version', typeof health.version === 'string' && health.version.length > 0);

r = await worker.fetch(new Request('https://kulpio.test/api', {
  method: 'OPTIONS',
  headers: { Origin: 'https://kulpio.test' },
}), {});
check('same-origin CORS preflight is accepted', r.status === 204 && r.headers.get('Access-Control-Allow-Origin') === 'https://kulpio.test');

r = await worker.fetch(new Request('https://kulpio.test/api', {
  method: 'OPTIONS',
  headers: { Origin: 'https://attacker.example' },
}), {});
check('cross-origin CORS preflight is rejected by default', r.status === 403);

console.log(results.join('\n'));
process.exit(results.some(x => x.startsWith('FAIL')) ? 1 : 0);
