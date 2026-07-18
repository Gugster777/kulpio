// Generate the VAPID key pair for Kulpio's expiry pushes.
//
//   node tools/gen-vapid.mjs
//
// Then store both values as Worker secrets:
//   npx wrangler secret put VAPID_PUBLIC        (paste the public key)
//   npx wrangler secret put VAPID_PRIVATE_JWK   (paste the private JWK line)
// Optional: VAPID_SUBJECT = mailto:you@example.com
import { webcrypto as crypto } from 'node:crypto';

const b64u = buf => Buffer.from(buf).toString('base64url');
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
const pub = await crypto.subtle.exportKey('raw', pair.publicKey);      // uncompressed point — what PushManager wants
const priv = await crypto.subtle.exportKey('jwk', pair.privateKey);

console.log('VAPID_PUBLIC:\n' + b64u(pub) + '\n');
console.log('VAPID_PRIVATE_JWK:\n' + JSON.stringify(priv));
