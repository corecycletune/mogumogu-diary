import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {encryptPush,vapidJwt} from '../src/index.js';
const crypto=webcrypto;
globalThis.crypto=crypto;
const enc=new TextEncoder(),dec=new TextDecoder();
const b64url=b=>Buffer.from(b).toString('base64url');
const from64=s=>new Uint8Array(Buffer.from(s,'base64url'));
const concat=(...arr)=>{const out=new Uint8Array(arr.reduce((n,x)=>n+x.length,0));let i=0;for(const x of arr){out.set(x,i);i+=x.length;}return out;};
async function derive(ikm,salt,info,length){
  const key=await crypto.subtle.importKey('raw',ikm,'HKDF',false,['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt,info},key,length*8));
}
test('Web Push payload decrypts with the receiving browser keys',async()=>{
  const receiver=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);
  const publicBytes=new Uint8Array(await crypto.subtle.exportKey('raw',receiver.publicKey));
  const auth=crypto.getRandomValues(new Uint8Array(16));
  const message={groupId:'A'.repeat(24),groupName:'なかよし',sender:'ichika'};
  const body=await encryptPush({p256dh:b64url(publicBytes),auth:b64url(auth)},message);
  assert.equal(body[20],65);
  const salt=body.slice(0,16),sender=body.slice(21,86),encrypted=body.slice(86);
  const senderKey=await crypto.subtle.importKey('raw',sender,{name:'ECDH',namedCurve:'P-256'},false,[]);
  const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:senderKey},receiver.privateKey,256));
  const ikm=await derive(shared,auth,concat(enc.encode('WebPush: info\0'),publicBytes,sender),32);
  const cek=await derive(ikm,salt,enc.encode('Content-Encoding: aes128gcm\0'),16);
  const nonce=await derive(ikm,salt,enc.encode('Content-Encoding: nonce\0'),12);
  const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']);
  const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},key,encrypted));
  assert.equal(plain.at(-1),2);
  assert.deepEqual(JSON.parse(dec.decode(plain.slice(0,-1))),message);
});
test('VAPID ES256 token verifies with corresponding public key',async()=>{
  const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
  const publicBytes=concat(new Uint8Array([4]),from64(jwk.x),from64(jwk.y));
  const jwt=await vapidJwt({
    VAPID_PUBLIC_KEY:b64url(publicBytes),VAPID_PRIVATE_KEY:jwk.d,
    VAPID_SUBJECT:'https://corecycletune.github.io/mogumogu-diary/'
  },'https://fcm.googleapis.com/fcm/send/abc');
  const [head,payload,signature]=jwt.split('.');
  assert.equal(JSON.parse(Buffer.from(payload,'base64url').toString()).aud,'https://fcm.googleapis.com');
  assert.equal(await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},pair.publicKey,from64(signature),enc.encode(head+'.'+payload)),true);
});
