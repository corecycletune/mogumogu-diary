import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {canUseDevTools,isDevModeEnabled} from '../developer-access.js';
import {registrationAccountId} from '../account-id.js';
test('developer access requires server role and UID, never login ID or profile',()=>{
  assert.equal(canUseDevTools({uid:'adminUid',isAdmin:true}),true);
  for(const account of [undefined,{}, {id:'admin'}, {uid:'u',id:'admin',isAdmin:false},{uid:'u',id:'junsakata0720'},{isAdmin:true}])assert.equal(canUseDevTools(account),false);
  assert.equal(isDevModeEnabled({uid:'u',isAdmin:true},'?dev=1'),true);
  assert.equal(isDevModeEnabled({uid:'u',isAdmin:false},'?dev=1'),false);
  assert.equal(isDevModeEnabled({uid:'u',isAdmin:true},'?dev=0'),false);
});
test('admin reserved after normalization, arbitrary supported IDs register',()=>{
  for(const id of ['admin','ADMIN',' admin '])assert.throws(()=>registrationAccountId(id),/reserved-id/);
  for(const id of ['junsakata0720','alice_123','user999'])assert.equal(registrationAccountId(id),id);
});
test('common app and former URLs never select a profile',async()=>{
  const html=await readFile(new URL('../p/app/index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/data-profile/);assert.match(html,/id="adminWorkspace" hidden/);
  for(const name of ['jun','ichika','sato']){const old=await readFile(new URL('../p/'+name+'/index.html',import.meta.url),'utf8');assert.match(old,/location.replace\("\.\.\/app\//);assert.doesNotMatch(old,/data-profile/);}
  const bootstrap=await readFile(new URL('../account-bootstrap.js',import.meta.url),'utf8');assert.match(bootstrap,/sandboxContext/);assert.doesNotMatch(bootstrap,/importLegacy|legacyMeals|account\.data\.profile/);
});
