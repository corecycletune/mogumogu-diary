// Local UI smoke test with a mocked cloud boundary; no production account/data access.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
try{
  for(const [uid,id] of [['existingUid','junsakata0720'],['newUid','alice_123']]){
    const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/firebase-sync.js',route=>route.fulfill({contentType:'text/javascript',body:`
      import {freshGame} from './progress-store.js';
      import {emptyQuests} from './quest-core.js';
      const uid=${JSON.stringify(uid)},id=${JSON.stringify(id)},account={user:{uid},data:{accountId:id,profile:'unusedOldValue'}};
      let game={...freshGame(uid),coins:789,tickets:4,inventory:{rice_n:{copies:9}}},quests=emptyQuests(uid),meals=[];window.testQuests=quests;
      const gameListeners=[],questListeners=[],mealListeners=[],meta={fromCache:false,hasPendingWrites:false};window.cloudWrites=[];
      const ctx={uid,profile:uid,isAccount:true,ready:async()=>{},
        watchGame:fn=>{gameListeners.push(fn);fn(game,meta);return ()=>{};},
        watchQuests:fn=>{questListeners.push(fn);fn(quests,meta);return ()=>{};},
        updateGame:async fn=>{const next=fn(game);if(next){game=next;for(const cb of gameListeners)cb(game,meta);}return next;},
        updateAdventure:async fn=>{const next=fn(quests,game);if(next){quests=next.quests;window.testQuests=quests;if(next.game)game=next.game;for(const cb of gameListeners)cb(game,meta);for(const cb of questListeners)cb(quests,meta);}return next;},
        watch:fn=>{mealListeners.push(fn);fn(meals,{fromCache:false,confirmedIds:meals.map(m=>m.id)});return ()=>{};},
        saveMeal:async entry=>{window.cloudWrites.push(entry);meals.push(entry);for(const fn of mealListeners)fn(meals,{fromCache:false,confirmedIds:meals.map(m=>m.id)});},
        deleteMeal:async()=>{}};
      export async function currentAccount(){return account;}
      export async function ensureAccount(){return account;}
      export function personalContext(){return ctx;}
      export async function restoreAccountGroups(){localStorage.setItem('mogumogu:groups:'+uid,'[]');}
      export async function logoutAccount(){}
      export async function changeAccountPassword(){}
    `}));
    await page.goto('http://127.0.0.1:8765/p/jun/?dev=1');
    await page.waitForFunction(()=>window.MogumoguAccount&&!document.querySelector('main').inert);
    assert.match(page.url(),/\/p\/app\//);
    assert.equal(await page.locator('#accountName').textContent(),id);
    assert.equal(await page.locator('[data-dev-entry]').evaluateAll(items=>items.every(item=>!item.hidden)),id==='junsakata0720');
    assert.equal(await page.locator('[data-panel="bonus"] #coins,[data-panel="bonus"] #markedDays,[data-panel="bonus"] #bonusDays,[data-panel="bonus"] [data-dev-entry]').count(),0);
    assert.equal(await page.locator('.header-values .header-value').count(),3);
    assert.equal(await page.locator('#headerCoins').textContent(),'799'); // 789 plus the existing daily login reward
    assert.equal(await page.locator('#headerTickets').textContent(),'4');
    assert.equal(await page.locator('.home-rewards .reward-strip button').count(),3);
    for(const [index,target] of [[0,'bonus'],[1,'bonus'],[2,'calendar']]){
      await page.locator('.home-rewards .reward-strip button').nth(index).click();
      assert.equal(await page.locator('[data-panel="'+target+'"]').isVisible(),true);
      await page.locator('.game-nav [data-target="home"]').click();
    }
    await page.locator('.game-nav [data-target="bonus"]').click();
    await page.locator('#gameCoinDraw').click();
    await page.waitForSelector('#gameResult .draw-result');
    assert.match(await page.locator('#gachaMachine').getAttribute('class'),/is-revealed rarity-(n|r|sr|ssr|ur)/);
    assert.equal(await page.locator('#headerCoins').textContent(),'699');
    await page.locator('.settings-button').click();
    assert.equal(await page.locator('#devPanel').isVisible(),id==='junsakata0720');
    if(id==='junsakata0720'){
      await page.waitForFunction(()=>document.querySelector('#ssrPrismTrial .card-full-art')?.naturalWidth>0);
      assert.match(await page.locator('#ssrPrismTrial .card-full-art').getAttribute('src'),/rousseau_jungle_ssr\.webp/);
      await page.locator('#prismTrialMode').selectOption('ssr-stardust');
      assert.equal(await page.locator('#ssrPrismTrial .foil-ssr-stardust').count(),1);
      assert.match(await page.locator('#ssrPrismTrial .card-ssr-gold').getAttribute('src'),/ssr-gold-trim\.svg$/);
    }
    assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'true');
    await page.locator('#soundVolume').fill('25');
    await page.locator('#bgmToggle').click();
    await page.reload();await page.waitForFunction(()=>window.MogumoguAccount&&!document.querySelector('main').inert);
    await page.locator('.settings-button').click();
    assert.equal(await page.locator('#soundVolume').inputValue(),'25');
    assert.equal(await page.locator('#bgmToggle').getAttribute('aria-pressed'),'true');
    await page.locator('#bgmToggle').click();
    await page.locator('.game-nav [data-target="home"]').click();
    await page.locator('.home-meal [data-target="timer"]').click();
    await page.locator('#manualMeal').selectOption('snack');
    await page.locator('#manualTime').fill('00:00');
    await page.locator('#manualFoodNote').fill('りんご');
    await page.locator('#manualSubmit').click();
    await page.waitForFunction(()=>window.cloudWrites.length===1);
    const entry=await page.evaluate(()=>window.cloudWrites[0]);assert.equal(entry.profile,uid);assert.equal(entry.foodNote,'りんご');
    await page.locator('.game-nav [data-target="home"]').click();
    await page.locator('.habit-manager > summary').click();
    await page.locator('#questName').fill('体重を測る');
    await page.locator('#questExtraEnabled').check();
    await page.locator('#questExtraLabel').fill('体重');
    await page.locator('#questAdd').click();
    const habit=page.locator('#questList .quest-row').filter({hasText:'体重を測る'});
    await habit.getByRole('button',{name:'できた！'}).click();
    await page.locator('#questConfirm input').fill('52.5kg');
    await page.locator('#questConfirm').getByRole('button',{name:'完了する'}).click();
    await page.waitForFunction(()=>Object.values(window.testQuests.values||{}).includes('52.5kg'));
    await page.locator('.game-nav [data-target="calendar"]').click();
    const day=await page.evaluate(()=>Object.keys(window.testQuests.days)[0]);
    await page.locator('#calendarGrid [data-day="'+day+'"]').click();
    assert.match(await page.locator('#stampDetails').textContent(),/体重.*52\.5kg/);
    await page.locator('#stampDetails').getByRole('button',{name:'閉じる'}).click();
    await page.locator('.game-nav [data-target="home"]').click();
    page.once('dialog',dialog=>dialog.accept());
    await habit.getByRole('button',{name:'削除する'}).click();
    await page.waitForFunction(()=>Object.keys(window.testQuests.tasks).length===0);
    assert.equal(await page.evaluate(()=>Object.values(window.testQuests.days).flat().length)>0,true);
    for(const width of [320,768]){
      await page.setViewportSize({width,height:844});
      await page.locator('.game-nav [data-target="menu"]').click();
      await page.locator('[data-panel="menu"] [data-target="family"]').click();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  const page=await browser.newPage();await page.route('**/firebase-sync.js',route=>route.fulfill({contentType:'text/javascript',body:'export async function currentAccount(){return null;} export async function ensureAccount(){} export async function loginAccount(){} export async function registerAccount(){}'}));
  await page.goto('http://127.0.0.1:8765/account.html');await page.locator('#accountSwitch').click();assert.equal(await page.locator('#accountConfirm').isVisible(),true);assert.equal(await page.locator('#legacyProfile,#accountImport').count(),0);
  console.log('PASS: common mobile page, old URL redirect, two UID-specific accounts and meals, no profile selection');
}finally{await browser.close();}
