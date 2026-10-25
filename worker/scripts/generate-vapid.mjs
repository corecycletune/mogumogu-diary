// Run locally only: node scripts/generate-vapid.mjs
// Do not save or commit the private key to the repository.
import {generateKeyPairSync} from 'node:crypto';
const {privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const jwk=privateKey.export({format:'jwk'});
const publicKey=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,'base64url'),Buffer.from(jwk.y,'base64url')]).toString('base64url');
console.log('VAPID_PUBLIC_KEY='+publicKey);
console.log('VAPID_PRIVATE_KEY='+jwk.d);
console.log('\nStore both values in Cloudflare Worker Secrets. Do not commit or share the private key.');
