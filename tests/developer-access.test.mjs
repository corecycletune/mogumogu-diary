import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {canUseDevTools,isDevModeEnabled} from '../developer-access.js';
import {normalizeAccountId} from '../account-id.js';
test('existing personal developer preview remains separate from profile URLs',()=>{
  assert.equal(canUseDevTools({uid:'actualUid',id:'junsakata0720'}),true);
  for(const account of [undefined,{}, {id:'junsakata0720'},{uid:'u',id:'admin'},{uid:'u',id:'jun'},{uid:'u',id:'ichika'},{uid:'u',id:'sato'}])assert.equal(canUseDevTools(account),false);
  assert.equal(isDevModeEnabled({uid:'u',id:'junsakata0720'},'?dev=1'),true);
  assert.equal(isDevModeEnabled({uid:'u',id:'alice'},'?dev=1'),false);
  assert.equal(isDevModeEnabled({uid:'u',id:'junsakata0720'},'?dev=0'),false);
});
test('arbitrary IDs including admin have the same registration rules',()=>{
  for(const id of ['admin','ADMIN','junsakata0720','alice_123','user999'])assert.equal(normalizeAccountId(id),id.toLowerCase());
});
test('common app and former URLs never select a profile',async()=>{
  const html=await readFile(new URL('../p/app/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/data-profile|adminWorkspace/);
  for(const name of ['jun','ichika','sato']){const old=await readFile(new URL('../p/'+name+'/index.html',import.meta.url),'utf8');assert.match(old,/location.replace\("\.\.\/app\//);assert.doesNotMatch(old,/data-profile/);}
  const bootstrap=await readFile(new URL('../account-bootstrap.js',import.meta.url),'utf8');assert.doesNotMatch(bootstrap,/sandboxContext|isAdmin|importLegacy|legacyMeals|account\.data\.profile/);
});
