import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const code=await readFile(new URL('../developer-access.js',import.meta.url),'utf8');
const {canUseDevTools,isDevModeEnabled}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('only the authenticated developer account can see developer entry on jun profile',()=>{
  assert.equal(canUseDevTools('jun','junsakata0720'),true);
  for(const id of ['jun','ichika','someoneelse','JUNSAKATA0720',undefined,null]){
    assert.equal(canUseDevTools('jun',id),false);
  }
  assert.equal(canUseDevTools('ichika','junsakata0720'),false);
  assert.equal(canUseDevTools('sato','junsakata0720'),false);
});

test('a URL parameter alone never enables developer features',()=>{
  assert.equal(isDevModeEnabled('jun','junsakata0720','?dev=1'),true);
  assert.equal(isDevModeEnabled('jun','anotheruser','?dev=1'),false);
  assert.equal(isDevModeEnabled('ichika','junsakata0720','?dev=1'),false);
  assert.equal(isDevModeEnabled('jun','junsakata0720','?dev=0'),false);
  assert.equal(isDevModeEnabled('jun','junsakata0720','?other=1'),false);
});

test('developer entry is initially hidden and revealed only after account verification',async()=>{
  const html=await readFile(new URL('../p/jun/index.html',import.meta.url),'utf8');
  assert.equal((html.match(/data-dev-entry hidden/g)||[]).length,2);
  const bootstrap=await readFile(new URL('../account-bootstrap.js',import.meta.url),'utf8');
  assert.match(bootstrap,/canUseDevTools\(profile,account\.data\.accountId\)/);
  assert.match(bootstrap,/querySelectorAll\('\[data-dev-entry\]'\)/);
});

test('all developer preview scripts require the same account and URL check',async()=>{
  for(const filename of ['game.js','card-layer-lab.js','ssr-prism-trial.js']){
    const src=await readFile(new URL('../'+filename,import.meta.url),'utf8');
    assert.match(src,/isDevModeEnabled\(profile,window\.MogumoguAccount\?\.id,location\.search\)|isDevModeEnabled\(profile,window\.MogumoguAccount\?\.id,window\.location\.search\)/);
  }
});
