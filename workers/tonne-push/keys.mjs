const b64u = buf => Buffer.from(buf).toString('base64url');
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
console.log('VAPID_PUBLIC  =', b64u(await crypto.subtle.exportKey('raw', publicKey)));
console.log('VAPID_PRIVATE =', (await crypto.subtle.exportKey('jwk', privateKey)).d);
