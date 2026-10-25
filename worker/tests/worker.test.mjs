import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
const origin='https://corecycletune.github.io';
const env={APP_ORIGIN:origin,VAPID_PUBLIC_KEY:'public-key-test'};
const request=(path,method='GET',from=origin)=>new Request('https://worker.example'+path,{method,headers:{Origin:from}});
test('public config contains only public key',async()=>{
  const res=await worker.fetch(request('/config'),env);
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{vapidPublicKey:'public-key-test'});
  assert.equal(res.headers.get('access-control-allow-origin'),origin);
});
test('cross-origin requests are rejected',async()=>{
  const res=await worker.fetch(request('/config','GET','https://evil.example'),env);
  assert.equal(res.status,403);
});
test('preflight allows authenticated POST and GET',async()=>{
  const res=await worker.fetch(request('/notify','OPTIONS'),env);
  assert.equal(res.status,204);
  assert.match(res.headers.get('access-control-allow-methods'),/POST/);
});
test('unconfigured notify endpoint cannot send',async()=>{
  const res=await worker.fetch(request('/notify','POST'),env);
  assert.equal(res.status,503);
});
test('unknown endpoints are not exposed',async()=>{
  const res=await worker.fetch(request('/other'),env);
  assert.equal(res.status,404);
});
