// Local UI smoke test with a mocked cloud boundary; no production account/data access.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
try{
  for(const isAdmin of [false,true]){
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/firebase-sync.js',route=>route.fulfill({contentType:'text/javascript',body:`
      import {sandboxContext,freshGame} from './progress-store.js';
      const isAdmin=${isAdmin},uid=isAdmin?'adminOwner':'existingUid',id=isAdmin?'admin':'junsakata0720';
      const account={user:{uid},data:{accountId:id,profile:'unusedOldValue'},isAdmin};
      const ctx=sandboxContext(uid);ctx.isAccount=true;ctx.isLocal=false;
      await ctx.updateGame(()=>({...freshGame(uid),coins:789,tickets:4,inventory:{rice_n:{copies:9}}}));
      let meals=[];const cb=[];window.cloudWrites=[];
      ctx.watch=(fn)=>{cb.push(fn);fn(meals,{fromCache:false,confirmedIds:meals.map(m=>m.id)});return ()=>{};};
      ctx.saveMeal=async entry=>{window.cloudWrites.push(entry);meals.push(entry);for(const fn of cb)fn(meals,{fromCache:false,confirmedIds:meals.map(m=>m.id)});};
      ctx.deleteMeal=async()=>{};
      export async function currentAccount(){return account;}
      export async function ensureAccount(){return account;}
      export function personalContext(){return ctx;}
      export async function restoreAccountGroups(){localStorage.setItem('mogumogu:groups:'+uid,'[]');}
      export async function logoutAccount(){}
      export async function changeAccountPassword(){}
    `}));
    await page.goto('http://127.0.0.1:8765/p/jun/?dev=1#developer');
    await page.waitForFunction(()=>window.MogumoguAccount&&!document.querySelector('main').inert);
    assert.match(page.url(),/\/p\/app\//);
    assert.equal(await page.locator('#accountName').textContent(),isAdmin?'admin':'junsakata0720');
    assert.equal(await page.locator('#adminWorkspace').isVisible(),isAdmin);
    if(isAdmin){
      assert.equal(await page.locator('#accountLogout').isVisible(),true);
      assert.equal(await page.locator('#devPanel').isVisible(),true);
      await page.locator('#adminWorkspace [data-target="bonus"]').click();
      await page.locator('#gameFreeDraw').click();
      await page.waitForFunction(()=>document.querySelector('#devDrawCount').textContent.includes('1回'));
      assert.equal(await page.evaluate(()=>window.cloudWrites.length),0);
      assert.equal(await page.evaluate(()=>window.MogumoguAccount.context.isSandbox),true);
      const snapshot=await page.evaluate(()=>window.MogumoguAccount.context.snapshot());assert.equal(snapshot.game,null);
      assert.equal(await page.locator('#gameCoinDraw').isDisabled(),true);
      await page.locator('#adminWorkspace [data-target="history"]').click();
      assert.equal(await page.locator('#accountLogout').isVisible(),true);
    }else{
      assert.equal(await page.locator('[data-dev-entry]:visible').count(),0);
      assert.equal(await page.locator('#devPanel').isVisible(),false);
      await page.locator('.game-nav [data-target="home"]').click();
      await page.locator('.home-meal [data-target="timer"]').click();
      await page.locator('#manualMeal').selectOption('snack');
      await page.locator('#manualTime').fill('00:00');
      await page.locator('#manualFoodNote').fill('りんご');
      await page.locator('#manualSubmit').click();
      await page.waitForFunction(()=>window.cloudWrites.length===1);
      const entry=await page.evaluate(()=>window.cloudWrites[0]);assert.equal(entry.profile,'existingUid');assert.equal(entry.foodNote,'りんご');
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  // Registration UI contains no legacy selection/import controls.
  const page=await browser.newPage();await page.route('**/firebase-sync.js',route=>route.fulfill({contentType:'text/javascript',body:'export async function currentAccount(){return null;} export async function ensureAccount(){} export async function loginAccount(){} export async function registerAccount(){}'}));
  await page.goto('http://127.0.0.1:8765/account.html');await page.locator('#accountSwitch').click();assert.equal(await page.locator('#accountConfirm').isVisible(),true);assert.equal(await page.locator('#legacyProfile,#accountImport').count(),0);
  console.log('PASS: 390px common page, legacy URL redirect, general meal recording, hidden admin tools, admin test draw without persistence, usable admin logout and registration UI');
}finally{await browser.close();}
