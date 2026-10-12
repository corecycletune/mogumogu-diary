import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const listeners={},buckets=new Map(),network=[];let offline=false;
const origin='https://example.test',scope=origin+'/mogumogu/';
const urlOf=req=>typeof req==='string'?new URL(req,scope).href:req.url;
function bucket(name){
  if(!buckets.has(name)){
    const values=new Map();
    buckets.set(name,{
      match:async(req,options={})=>{const url=urlOf(req);let value=values.get(url);if(!value&&options.ignoreSearch)value=[...values].find(([key])=>key.split('?')[0]===url.split('?')[0])?.[1];return value?.clone();},
      put:async(req,response)=>values.set(urlOf(req),response.clone()),
      addAll:async requests=>{for(const req of requests){const response=await fetchMock(req);values.set(urlOf(req),response);}},
      keys:async()=>[...values.keys()].map(url=>new Request(url)),
      values
    });
  }return buckets.get(name);
}
async function fetchMock(req){if(offline)throw new Error('offline');network.push(urlOf(req));return new Response('network:'+urlOf(req),{status:200});}
const cacheApi={open:async name=>bucket(name),keys:async()=>[...buckets.keys()],delete:async name=>buckets.delete(name),match:async req=>{for(const value of buckets.values()){const hit=await value.match(req);if(hit)return hit;}}};
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const legacy='mogumogu-static-v35',older='mogumogu-static-v34';bucket(older);
const reused=scope+'assets/cards/full-art/reused.webp?v=1';await bucket(legacy).put(reused,new Response('legacy-art'));
vm.runInNewContext(source,{URL,Request,Response,caches:cacheApi,fetch:fetchMock,self:{registration:{scope},location:{origin},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}}});
async function lifecycle(name){const tasks=[];listeners[name]({waitUntil:promise=>tasks.push(promise)});await Promise.all(tasks);}
async function request(url,navigate=false){let response;const tasks=[];const req=new Request(url);if(navigate)Object.defineProperty(req,'mode',{value:'navigate'});listeners.fetch({request:req,respondWith:promise=>response=promise,waitUntil:promise=>tasks.push(promise)});const result=await response;await Promise.all(tasks);return result;}
await lifecycle('install');assert.ok(network.length>0);assert.ok(network.every(url=>!url.includes('/assets/cards/')));assert.ok(network.length<=30);
await lifecycle('activate');assert.ok(buckets.has(legacy));assert.ok(!buckets.has(older));
const before=network.length;assert.equal(await (await request(reused)).text(),'legacy-art');assert.equal(network.length,before);
const image=scope+'assets/cards/full-art/new.webp?v=2';await request(image);assert.equal(network.length,before+1);await request(image);assert.equal(network.length,before+1);
offline=true;assert.equal(await (await request(image)).text(),'network:'+image);assert.ok((await request(scope+'p/jun/?dev=1',true)).ok);
let intercepted=false;listeners.fetch({request:new Request('https://www.gstatic.com/firebasejs/app.js'),respondWith:()=>intercepted=true,waitUntil:()=>{}});assert.equal(intercepted,false);
console.log('PASS: shell-only precache, retained previous art, lazy cache reuse, cached images need no repeat network, offline shell/image access, external Firebase requests unchanged');
