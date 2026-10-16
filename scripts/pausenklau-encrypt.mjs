// Encrypts pausenklau/plan.private.json (gitignored: real teacher names) into
// pausenklau/plan.enc.json, which is safe to commit. The password is never stored
// anywhere: the page derives the key from what you type (PBKDF2 → AES-GCM).
//
// Usage: node scripts/pausenklau-encrypt.mjs "<password>"
// Run it again with a new password to change it, or after editing the plan.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as c } from 'node:crypto';

const pw = process.argv[2];
if (!pw) { console.error('Usage: node scripts/pausenklau-encrypt.mjs "<password>"'); process.exit(1); }

const plain = readFileSync(new URL('../pausenklau/plan.private.json', import.meta.url));
JSON.parse(plain); // refuse to encrypt broken JSON

const iter = 600000;
const salt = c.getRandomValues(new Uint8Array(16));
const iv = c.getRandomValues(new Uint8Array(12));
const base = await c.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await c.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const data = new Uint8Array(await c.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));

const b64 = u => Buffer.from(u).toString('base64');
writeFileSync(new URL('../pausenklau/plan.enc.json', import.meta.url),
  JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), data: b64(data) }) + '\n');
console.log('pausenklau/plan.enc.json written');
