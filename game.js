import {isDevModeEnabled} from './developer-access.js';
import {applyDraw,multiStatus,grantMultiRewards} from './multi-draw.js';
import {initSound,playSound} from './sound.js';
import {localDay,creditReward} from './quest-core.js';
import {freshGame} from './progress-store.js';
import {openCardDetails,putCardName} from './card-details.js';
import {CATALOG,BY_ID,levelForCopies,drawCharacter} from './game-catalog.js';
import {CARD_LAYER_MANIFEST,pickBackgroundForCard,frameForCard,sceneForRarity,SR_PREMIUM_TRIM,SSR_GOLD_FRAME} from './card-layer-manifest.js';
(function(){
'use strict';
const profile=window.MogumoguAccount?.uid;
if(!profile)return;
const el=id=>document.getElementById(id);
const bridge=window.MogumoguGameBridge;
const today=localDay;
const fresh=()=>freshGame(profile);
const clone=state=>state?JSON.parse(JSON.stringify(state)):fresh();
let ctx=null,unsubscribe=null,unwatchDailyQuests=null,dailyQuestDays={},dailyQuestsReady=false,state=fresh(),ready=false,busy=false,lastMealSignature='',statusError='',latestDraw=null,connectionSeq=0;
let testDrawCount=0,testInventory={};
const devAvailable=!!el('devModeToggle')&&isDevModeEnabled(window.MogumoguAccount,window.location.search);
if(devAvailable)el('devPanel').hidden=false;
if(devAvailable){const select=el('devCharacter');select.replaceChildren(new Option('ランダム抽選を使う','random'),...CATALOG.map(card=>new Option(card.rarity+'：'+card.name,card.id)));}
function isTesting(){return devAvailable&&el('devModeToggle').checked;}
function testSummary(){
  if(!devAvailable)return;
  el('devDrawCount').textContent='テスト抽選：'+testDrawCount+'回（未保存）';
  el('devConnectionStatus').textContent=!ctx
    ?'この端末でプレイできます。'
    :statusError
      ?'本番ガチャ：エラーあり。上部のエラー内容を確認してください。'
      :ready
        ?'プレイできます。'
        :'本番ガチャ：接続確認中。接続できない場合は「設定」の状態を確認してください。';
}
window.mogumoguGameManaged=true;
const rarityRank=['N','R','SR','SSR','UR'];
initSound();
let latestResults=[],celebrating=false,collectionKey='',resultKey='',homeKey='',resultPage=0,tenRevealActive=false,tenRevealIndex=0,tenRevealFlipped=false;
let skipGachaAnimation=false,finishGachaStage=null;
const cardVisibility=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
  for(const entry of entries)entry.target.classList.toggle('card-in-view',entry.isIntersecting);
},{rootMargin:'80px'}):null;
function releaseCards(root){if(cardVisibility)for(const card of root.querySelectorAll('.card-art'))cardVisibility.unobserve(card);}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms));

function message(msg){const x=el('feedback');if(x){x.textContent=msg;x.hidden=false;clearTimeout(message.t);message.t=setTimeout(()=>{x.hidden=true;},3700);}}
function status(msg,error){statusError=error?msg:'';el('gameStatus').textContent=msg;el('gameStatus').classList.toggle('game-error',!!error);}
function setBusy(next){busy=next;renderHeader();}
function gameError(e){
  status('記録を保存できませんでした。もう一度お試しください。',true);
  renderHeader();
}
async function awardLogin(){
  if(!ctx)return;
  const d=today();
  try{
    const awarded=await ctx.updateGame(current=>{
      const st=clone(current);
      if(st.lastLoginDay===d)return null;
      st.lastLoginDay=d;st.loginDays+=1;creditReward(st,'coins',10);st.updatedAt=new Date().toISOString();
      return st;
    });
    if(awarded)message('ログインボーナス ＋10コイン！');
  }catch(e){gameError(e);}
}
async function connect(context){
  if(!context||!context.watchGame)return;
  const seq=++connectionSeq;
  ready=false;renderHeader();
  if(seq!==connectionSeq)return;
  if(unsubscribe)unsubscribe();
  unwatchDailyQuests?.();dailyQuestDays={};dailyQuestsReady=false;
  ctx=context;ready=false;statusError='';lastMealSignature='';latestDraw=null;latestResults=[];
  state=fresh();render();
  status('');
  unsubscribe=ctx.watchGame((value,meta)=>{
    if(seq!==connectionSeq)return;
    if(value && (value.version!==1||value.profile!==profile)){status('保存されたゲームデータの形式が一致しません。',true);ready=false;render();return;}
    state=value||fresh();
    ready=!meta.fromCache&&!meta.hasPendingWrites;
    if(!statusError)status(ready?'':'準備しています…');
    render();
    if(ready)window.dispatchEvent(new CustomEvent('mogumogu:game-ready'));
  },err=>{if(seq!==connectionSeq)return;ready=false;gameError(err);render();});
  unwatchDailyQuests=ctx.watchQuests((value,meta)=>{
    if(seq!==connectionSeq)return;dailyQuestDays=value?.days||{};dailyQuestsReady=!meta.fromCache&&!meta.hasPendingWrites;renderHeader();
  },()=>{if(seq!==connectionSeq)return;dailyQuestsReady=false;renderHeader();});
  await awardLogin();
  try{await ctx.updateAdventure((q,g)=>{
    if(!q||!g)return null;
    const next=clone(g);if(!grantMultiRewards(next,q.days))return null;
    return {quests:q,game:next};
  });}catch(e){gameError(e);}
}
function paintCard(char,entry,unknown,priority=false){
  const outer=document.createElement('button');
  outer.type='button';
  outer.setAttribute('aria-label',unknown?'未取得の'+char.rarity+'カード':char.name+'を拡大する');
  if(unknown){
    outer.className='collection-card unknown-card';outer.disabled=true;
    const hidden=document.createElement('div');hidden.className='card-art unknown-art';
    const question=document.createElement('span');question.className='card-question';question.textContent='？';
    const label=document.createElement('span');label.className='card-rarity';label.textContent=char.rarity;
    const name=document.createElement('strong');name.className='card-name';name.textContent='？？？？';
    hidden.append(question,label,name);outer.append(hidden);return outer;
  }
  outer.addEventListener('click',()=>openCardDetails(char,entry?.copies>0?{copies:entry.copies,level:levelForCopies(entry.copies)}:null,outer.querySelector('.card-art')));
  outer.className='collection-card rarity-'+char.rarity.toLowerCase();
  const art=document.createElement('div');
  art.className='card-art rarity-'+char.rarity.toLowerCase();
  if(entry)art.className+=' evolved-level-'+levelForCopies(entry.copies);
  const layers=CARD_LAYER_MANIFEST[char.id];
  function addLayer(cssClass,src,isDecorative){
    if(!src)return null;
    const img=document.createElement('img');
    img.className='composite-layer '+cssClass;
    img.loading=priority?'eager':'lazy';
    img.fetchPriority=priority&&!isDecorative?'high':'auto';
    img.src=src;
    img.alt=isDecorative?'':char.name+'のキャラクターイラスト';
    img.decoding='async';
    img.draggable=false;
    // Do not substitute generated SVG art when a character image is missing or fails.
    if(!isDecorative)img.addEventListener('error',()=>img.remove(),{once:true});
    art.appendChild(img);
    return img;
  }
  if(layers){
    art.className+=' layered-card visual-'+layers.layout+' foil-'+layers.foil;
    // SSR/UR can use a commissioned full-bleed card image instead of the layered
    // illustration. HTML name and rarity remain independently editable.
    // All other cards keep the separately editable five-layer composition.
    if(layers.fullArt){
      art.className+=' full-art-card';
      addLayer('card-full-art',layers.fullArt,false);
      if(layers.foil!=='none'){
        const foil=document.createElement('div');
        foil.className='composite-layer composite-foil full-art-foil';
        foil.setAttribute('aria-hidden','true');
        art.appendChild(foil);
        const glint=document.createElement('div');
        glint.className='composite-layer composite-glint full-art-glint';
        glint.setAttribute('aria-hidden','true');
        art.appendChild(glint);
      }
    }else{
    addLayer('card-background-image',pickBackgroundForCard(char.id,char.rarity),true);
    if(layers.foil!=='none'){
      const foilBase=document.createElement('div');
      foilBase.className='composite-layer composite-foil';
      foilBase.setAttribute('aria-hidden','true');art.appendChild(foilBase);
    }
    addLayer('card-scene',sceneForRarity(char.rarity),true);
    addLayer('card-frame-under',layers.lowerFrame,true);
    addLayer('card-portrait',layers.character,false);
    addLayer('card-frame-over',layers.upperFrame,true);
    if(!art.classList.contains('foil-none')){
      const glint=document.createElement('div');
      glint.className='composite-layer composite-glint';
      glint.setAttribute('aria-hidden','true');art.appendChild(glint);
    }
    }
  }else{
    // All cards receive the same approved raster background and rarity-specific
    // foil. Missing character art stays empty: no SVG or emoji fallback.
    const foilByRarity={N:'none',R:'none',SR:'pearl',SSR:'sunflower',UR:'legendary'};
    art.className+=' layered-card foil-'+(foilByRarity[char.rarity]||'none');
    addLayer('card-background-image',pickBackgroundForCard(char.id,char.rarity),true);
    if(!art.classList.contains('foil-none')){
      const foil=document.createElement('div');
      foil.className='composite-layer composite-foil';
      foil.setAttribute('aria-hidden','true');art.appendChild(foil);
    }
    // Every N/R/SR card, including ones without individual art assets,
    // receives its stable, themed split-SVG frame set.
    addLayer('card-scene',sceneForRarity(char.rarity),true);
    const frame=frameForCard(char.id,char.rarity);
    if(frame)addLayer('card-frame-under',frame.lowerFrame,true);
    if(frame)addLayer('card-frame-over',frame.upperFrame,true);
    const glint=document.createElement('div');
    glint.className='composite-layer composite-glint';
    glint.setAttribute('aria-hidden','true');
    art.appendChild(glint);
  }
  if(char.rarity==='SSR')addLayer('card-ssr-gold',SSR_GOLD_FRAME,true);
  if(char.rarity==='SR')addLayer('card-sr-premium',SR_PREMIUM_TRIM,true);
  const rarity=document.createElement('span');rarity.className='card-rarity';rarity.textContent=char.rarity;art.appendChild(rarity);
  const name=document.createElement('strong');name.className='card-name';putCardName(name,unknown?'未発見':char.name);
  art.appendChild(name);outer.appendChild(art);
  if(!art.classList.contains('foil-none')){
    if(cardVisibility)cardVisibility.observe(art);else art.classList.add('card-in-view');
  }
  if(entry){const meta=document.createElement('div');meta.className='card-subtitle';meta.textContent=entry.copies>0?'Lv.'+levelForCopies(entry.copies)+' · '+entry.copies+'枚所持':'未所持（動作確認）';outer.appendChild(meta);}
  return outer;
}
function renderCollection(){
  const target=el('collectionGrid');
  if(target.closest('[data-panel]')?.hidden)return;
  const filter=el('collectionFilter').value,testing=isTesting();
  const copiesFor=id=>testing?(testInventory[id]??state.inventory[id]?.copies??0):(state.inventory[id]?.copies||0);
  const key=JSON.stringify([testing,filter,CATALOG.map(card=>[card.id,copiesFor(card.id)])]);
  if(key===collectionKey)return;
  collectionKey=key;releaseCards(target);target.replaceChildren();
  // Only explicit developer testing shows unobtained artwork and hidden URs.
  const visible=CATALOG.filter(card=>testing||card.rarity!=='UR'||copiesFor(card.id)>0);
  const filtered=visible.filter(card=>{
    if(filter==='owned')return copiesFor(card.id)>0;
    if(filter==='missing')return copiesFor(card.id)===0;
    if(filter==='omurice')return card.food==='オムライス';
    if(filter==='figures')return !!card.figure;
    return true;
  });
  filtered.sort((a,b)=>rarityRank.indexOf(b.rarity)-rarityRank.indexOf(a.rarity)||a.name.localeCompare(b.name,'ja'));
  for(const card of filtered){
    const copies=copiesFor(card.id);
    target.appendChild(paintCard(card,testing?{copies}:(state.inventory[card.id]||null),!testing&&copies===0));
  }
  if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='ここにはまだカードがありません。';target.appendChild(p);}
  const count=visible.filter(card=>state.inventory[card.id]).length;
  const publiclyCount=CATALOG.filter(x=>x.rarity!=='UR').length;
  el('collectionCount').textContent=testing?'🧪 動作確認 '+filtered.length+' / '+CATALOG.length+' 種（未保存）':'コレクション '+count+' / '+(publiclyCount+visible.filter(x=>x.rarity==='UR').length)+' 種 発見';
}
function renderHome(){
  const target=el('homeCards');if(!ready||!target||target.closest('[data-panel]').hidden)return;
  const owned=CATALOG.filter(card=>state.inventory[card.id]?.copies>0);
  el('homeCardCount').textContent=owned.length+'種の仲間に出会いました';
  const preview=owned.slice(-4),key=JSON.stringify(preview.map(card=>[card.id,state.inventory[card.id].copies]));
  if(key===homeKey&&target.childNodes.length)return;homeKey=key;releaseCards(target);target.replaceChildren();
  for(const card of preview)target.append(paintCard(card,state.inventory[card.id]));
  if(!preview.length){const empty=document.createElement('p');empty.className='card-empty';empty.textContent='？　はじめての仲間に会いにいこう';target.append(empty);}
}
function renderHeader(){
  el('gameCoinCount').textContent=ready?String(state.coins):'—';
  el('gameTickets').textContent=ready?String(state.tickets):'—';
  el('gamePullCount').textContent=ready?String(state.drawCount):'—';
  const testing=isTesting();
  const questCleared=!!dailyQuestDays[today()]?.length,already=state.lastFreeDay===today();
  el('gameFreeDraw').hidden=false;
  el('gameFreeDraw').disabled=busy||(!testing&&(!ready||!dailyQuestsReady||!questCleared||already));
  el('gameFreeDraw').textContent=testing?'🧪 テストガチャを引く（回数制限なし）':already?'✓ 今日のごほうびは引きました':questCleared?'🎁 今日のごほうびガチャを引く':'🔒 今日のクエストを1件達成すると引けます';
  // Prevent actual currency or tickets from being spent in testing mode.
  el('gameCoinDraw').disabled=busy||testing||!ready||state.coins<100;
  el('gameTicketDraw').disabled=busy||testing||!ready||state.tickets<1;
  el('gameCoinDraw').textContent='100コインで引く（残高 '+state.coins+'）';
  el('gameTicketDraw').textContent='ガチャ券で引く（'+state.tickets+'枚）';
  for(const size of [10,100]){
    const button=el(size===10?'gameTenDraw':'gameHundredDraw'),value=multiStatus(state,size);
    button.disabled=busy||(!testing&&(!ready||value!=='available'));
    button.classList.toggle('reward-available',value==='available');
    button.textContent=testing?'🧪 '+size+'連テスト（未保存）':value==='available'?'🎁 '+size+'連を引く（権利1回分）':value==='used'?'✓ '+size+'連のごほうびは使用済み':'🔒 '+size+'日連続で'+size+'連';
  }
  if(el('headerCoins')){el('headerCoins').textContent=ready?String(state.coins):'—';el('headerTickets').textContent=ready?String(state.tickets):'—';el('homeTickets').textContent=ready?state.tickets+'枚':'—';el('homeQuestReward').textContent=!ready||!dailyQuestsReady?'準備中':already?'使用済み':questCleared?'1回引ける':'解放待ち';el('homeMulti').textContent=[10,100].map(size=>size+'連：'+({available:'権利1回分あり',used:'使用済み',locked:size+'日連続で解放'}[multiStatus(state,size)]||size+'日連続で解放')).join(' ／ ');renderHome();}
  testSummary();
}
function updateResultControls(){
  const flipping=tenRevealActive&&latestResults.length===10;
  el('gachaFlipSkip').hidden=!flipping;
  el('gachaFlipNext').hidden=!flipping||!tenRevealFlipped;
  el('gachaFlipNext').textContent=tenRevealIndex===9?'10枚を並べる':'次のカードへ';
  el('gachaResultDone').hidden=flipping;
  el('gachaPageStatus').hidden=flipping;
  // Pagination visibility for the grid is decided by showLatestDraw().
  if(flipping){el('gachaPagePrev').hidden=true;el('gachaPageNext').hidden=true;}
}
function showTenReveal(){
  const target=el('gameResult'),result=latestResults[tenRevealIndex],card=BY_ID[result.id];
  const key=JSON.stringify(latestResults)+'|flip|'+tenRevealIndex+'|'+tenRevealFlipped;
  if(key===resultKey)return;
  resultKey=key;
  releaseCards(target);target.replaceChildren();
  const heading=document.createElement('h3');heading.className='game-win-title';
  heading.textContent=(result.test?'🧪 テスト結果　':'')+(tenRevealIndex+1)+' / 10枚目';
  target.append(heading);
  const stage=document.createElement('div');stage.className='gacha-flip-stage';
  const cardWrap=document.createElement('div');cardWrap.className='gacha-flip-card'+(tenRevealFlipped?' is-flipped':'');
  const back=document.createElement('button');back.type='button';back.className='gacha-flip-back';back.inert=tenRevealFlipped;
  back.setAttribute('aria-label',(tenRevealIndex+1)+'枚目のカードをめくる');
  back.innerHTML='<span class="gacha-flip-emblem" aria-hidden="true">🥚</span><span class="gacha-flip-mark" aria-hidden="true">✦ MOGUMOGU ✦</span><span class="gacha-flip-invite">タップしてめくる</span>';
  back.addEventListener('click',()=>{
    if(tenRevealFlipped)return;
    tenRevealFlipped=true;
    cardWrap.classList.add('is-flipped');
    back.disabled=true;back.inert=true;front.inert=false;
    updateResultControls();
    playSound('reveal',card.rarity);
    if(result.newCard)playSound('new');
  });
  const front=document.createElement('div');front.className='gacha-flip-front';front.inert=!tenRevealFlipped;
  const painted=paintCard(card,{copies:result.copies},false,true);
  if(result.newCard){const badge=document.createElement('span');badge.className='new-badge';badge.textContent='NEW';painted.append(badge);}
  front.append(painted);
  cardWrap.append(back,front);stage.append(cardWrap);target.append(stage);
  if(result.test){const hint=document.createElement('p');hint.className='game-test-warning';hint.textContent='練習ガチャです。保存されません。';target.append(hint);}
  updateResultControls();
}
function finishTenReveal(){
  if(!tenRevealActive)return;
  tenRevealActive=false;tenRevealFlipped=false;resultKey='';
  showLatestDraw();
}
function showLatestDraw(){
  if(celebrating)return;
  if(tenRevealActive&&latestResults.length===10){showTenReveal();return;}
  const target=el('gameResult');
  const results=latestResults.length?latestResults:latestDraw?[latestDraw]:[];
  const perPage=results.length>10?10:results.length||1;
  const pages=Math.max(1,Math.ceil(results.length/perPage));
  resultPage=Math.max(0,Math.min(resultPage,pages-1));
  const key=JSON.stringify(results)+'|'+resultPage;
  if(key===resultKey)return;
  resultKey=key;releaseCards(target);target.replaceChildren();
  if(!results.length)return;
  const head=document.createElement('h3');head.className='game-win-title';
  head.textContent=results[0].test?'🧪 テスト結果（未保存）':results.length>1?results.length+'連のごほうび！':results[0].newCard?'あたらしい仲間！':'また会えた！';
  target.append(head);
  const grid=document.createElement('div');grid.className=results.length>1?'multi-result-grid gacha-paged-grid':'game-reveal';
  const visible=results.slice(resultPage*perPage,(resultPage+1)*perPage);
  const shareActions=[];
  for(const result of visible){
    const card=BY_ID[result.id],tile=document.createElement('div');tile.className='draw-result reveal-'+card.rarity.toLowerCase();
    const painted=paintCard(card,{copies:result.copies},false,results.length===1);
    if(result.newCard){const badge=document.createElement('span');badge.className='new-badge';badge.textContent='NEW';painted.append(badge);tile.classList.add('first-discovery');}
    tile.append(painted);
    if(!result.test&&['SSR','UR'].includes(card.rarity)){
      const share=document.createElement('button');share.type='button';share.className='btn secondary share-card';share.textContent='グループに報告：'+card.name;
      share.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('mogumogu:share-card',{detail:{id:card.id}})));shareActions.push(share);
    }
    grid.append(tile);
  }
  target.append(grid);
  if(shareActions.length){const actions=document.createElement('div');actions.className='gacha-share-actions';actions.append(...shareActions);target.append(actions);}
  if(results.some(r=>r.test)){const hint=document.createElement('p');hint.className='game-test-warning';hint.textContent='練習ガチャです。コインやコレクションは変わりません。';target.append(hint);}
  el('gachaPagePrev').hidden=pages===1||resultPage===0;
  el('gachaPageNext').hidden=pages===1||resultPage===pages-1;
  el('gachaPageStatus').textContent=pages>1?(resultPage+1)+' / '+pages:results.length+'枚';
  updateResultControls();
}
// These effects are selected after the rarity draw. They never change draw odds.
// Hot is not a guarantee; its frequency rises with rarity.
function pickGachaEffect(rarity,phase){
  const weights={
    N:phase==='claw'?[97,2.9,.1]:[96,3.9,.1],
    R:phase==='claw'?[97,2.9,.1]:[96,3.9,.1],
    SR:phase==='claw'?[70,29,1]:[68,31,1],
    SSR:phase==='claw'?[12,60,28]:[15,57,28],
    UR:phase==='claw'?[5,30,65]:[6,27,67]
  }[rarity]||[100,0,0];
  const roll=Math.random()*100;
  return roll<weights[0]?'normal':roll<weights[0]+weights[1]?'chance':'hot';
}
function skipCurrentGachaStage(){
  skipGachaAnimation=true;
  if(finishGachaStage){const finish=finishGachaStage;finishGachaStage=null;finish();}
}
function gachaStageWait(ms){
  if(skipGachaAnimation||matchMedia('(prefers-reduced-motion: reduce)').matches)return Promise.resolve();
  return new Promise(resolve=>{
    const timer=setTimeout(()=>{finishGachaStage=null;resolve();},ms);
    finishGachaStage=()=>{clearTimeout(timer);resolve();};
  });
}
async function preview(characters=[]){
  celebrating=true;playSound('start');
  const machine=el('gachaMachine');
  const single=characters.length===1;
  const rarity=single?characters[0].rarity:null;
  const clawEffect=single?pickGachaEffect(rarity,'claw'):'normal';
  const eggEffect=single?pickGachaEffect(rarity,'egg'):'normal';
  machine.dataset.expectation=clawEffect;
  machine.dataset.hatch=eggEffect;
  machine.className='gacha-machine is-rolling';
  skipGachaAnimation=false;finishGachaStage=null;
  el('gachaAnimationSkip').hidden=!single;
  el('gachaResultDialog').close?.();
  const target=el('gameResult');resultKey='';releaseCards(target);target.replaceChildren();
  try{
    if(!single){
      status('🥚 タマゴを探しています…');
      await delay(350);playSound('confirm');await delay(300);
      return;
    }
    const steps=[
      ['search',450,'🥚 タマゴを探しています…'],
      ['drop',550,'🦾 アームがタマゴに近づいています…'],
      ['grab',380,'✨ タマゴをつかまえた！'],
      ['lift',620,clawEffect==='hot'?'🌈 激アツ！ アームが虹色に輝いた！':clawEffect==='chance'?'✨ チャンス！ アームが光っている！':'🥚 タマゴを運んでいます…'],
      ['hatch',650,eggEffect==='hot'?'🌈 タマゴから虹色の光！':eggEffect==='chance'?'✨ タマゴが金色に輝いた！':'🥚 タマゴが割れそう…']
    ];
    for(const [step,duration,caption] of steps){
      if(skipGachaAnimation)break;
      machine.className='gacha-machine is-rolling stage-'+step+' effect-'+clawEffect+' egg-'+eggEffect;
      status(caption);
      if(step==='grab')playSound('confirm');
      await gachaStageWait(duration);
    }
  }finally{
    finishGachaStage=null;
    el('gachaAnimationSkip').hidden=true;
  }
}
async function reveal(results){
  const rank=Math.max(...results.map(r=>rarityRank.indexOf(BY_ID[r.id].rarity))),rarity=rarityRank[rank];
  el('gachaMachine').className='gacha-machine is-revealed rarity-'+rarity.toLowerCase();
  el('gameResult').className='gacha-result result-'+rarity.toLowerCase();
  celebrating=false;resultPage=0;latestResults=results;latestDraw=results[0];
  tenRevealActive=results.length===10;tenRevealIndex=0;tenRevealFlipped=false;resultKey='';showLatestDraw();
  const dialog=el('gachaResultDialog');if(!dialog.open)dialog.showModal();
  status('');
  if(results.length!==10){playSound('reveal',rarity);if(results.some(r=>r.newCard))playSound('new');}
}
function render(){
  renderHeader();renderCollection();showLatestDraw();
}
async function testPull(count=1){
  if(!isTesting()||busy||![1,10,100].includes(count))return;
  const choice=el('devRarity').value;
  const chosenId=el('devCharacter').value;
  const selected=chosenId!=='random'?BY_ID[chosenId]:null;
  const pool=choice==='random'?null:CATALOG.filter(x=>x.rarity===choice);
  if(!selected&&pool&&!pool.length){message('選択したレア度のキャラクターがありません。');return;}
  // The simulation never calls updateGame/updateAdventure or modifies the saved state.
  // Fixed character/rarity choices apply to every slot; random uses real draw odds.
  const characters=Array.from({length:count},()=>{
    if(selected)return selected;
    if(!pool)return drawCharacter();
    const random=new Uint32Array(1);
    crypto.getRandomValues(random);
    return pool[random[0]%pool.length];
  });
  setBusy(true);
  try{
    await preview(characters);
    const results=characters.map(card=>{
      const copies=(testInventory[card.id]||0)+1;
      testInventory[card.id]=copies;
      return {id:card.id,copies,newCard:copies===1,test:true};
    });
    testDrawCount+=count;
    await reveal(results);
    renderCollection();
  }catch(e){
    status('テストガチャを表示できませんでした。もう一度お試しください。',true);
  }finally{
    celebrating=false;
    el('gachaMachine').classList.remove('is-rolling');
    el('gachaAnimationSkip').hidden=true;
    setBusy(false);
  }
}
async function pull(mode){
  if(isTesting()){
    const count=mode==='multi10'?10:mode==='multi100'?100:1;
    await testPull(count);
    return;
  }
  if(busy||!ctx||!ready){message('まだ準備中です。もう一度お試しください。');return;}
  const count=mode==='multi10'?10:mode==='multi100'?100:1;
  // Draw once outside the transaction: retries must keep the same random outcomes.
  const characters=Array.from({length:count},()=>drawCharacter());
  const d=today(),at=new Date().toISOString(),activeContext=ctx,seq=connectionSeq;
  setBusy(true);let displayed=false;
  try{
    await preview(characters);let chosen;
    let saved;
    if(mode==='free'){
      const bundle=await activeContext.updateAdventure((q,g)=>{
        if(!q||!g||today()!==d)return null;
        const result=applyDraw(clone(g),characters,mode,d,at,q.days);chosen=result?.results;
        return result?{quests:q,game:result.state}:null;
      });saved=bundle?.game;
    }else saved=await activeContext.updateGame(current=>{
      const result=applyDraw(clone(current),characters,mode,d,at);
      chosen=result?.results;return result?.state||null;
    });
    if(seq!==connectionSeq)return;
    if(!saved){message('今日のクエスト達成と、ごほうび・コイン・券の残りを確認してください。');return;}
    state=saved;await reveal(chosen);displayed=true;renderHeader();renderCollection();
  }catch(e){gameError(e);}
  finally{celebrating=false;el('gachaMachine').classList.remove('is-rolling');el('gachaAnimationSkip').hidden=true;setBusy(false);if(!displayed)showLatestDraw();}
}
if(devAvailable){
  const toggle=el('devModeToggle');
  toggle.addEventListener('change',()=>{
    el('devControls').hidden=!toggle.checked;
    // Never keep simulated cards after leaving test mode.
    testInventory={};testDrawCount=0;latestDraw=null;latestResults=[];tenRevealActive=false;resultKey='';
    if(toggle.checked)el('collectionFilter').value='all';
    render();
    if(toggle.checked)message('テストモードです。抽選は何度でもできますが保存されません。');
  });
  el('devReset').addEventListener('click',()=>{
    testDrawCount=0;testInventory={};latestDraw=null;latestResults=[];tenRevealActive=false;resultKey='';render();
    message('テスト結果をリセットしました。');
  });
}
for(const button of document.querySelectorAll('[data-gacha-count]')){
  if(button.tagName!=='BUTTON')continue;
  button.addEventListener('click',()=>{
    const count=button.dataset.gachaCount;
    el('gachaMachine').dataset.drawCount=count;
    for(const tab of document.querySelectorAll('.gacha-mode-switch button'))tab.setAttribute('aria-pressed',String(tab===button));
    for(const group of document.querySelectorAll('[data-gacha-actions]'))group.hidden=group.dataset.gachaActions!==count;
  });
}
const closeResult=()=>{const dialog=el('gachaResultDialog');if(dialog.open)dialog.close();tenRevealActive=false;tenRevealFlipped=false;resultKey='';};
el('gachaResultDialog').addEventListener('close',()=>{tenRevealActive=false;tenRevealFlipped=false;resultKey='';});
el('gachaAnimationSkip').addEventListener('click',skipCurrentGachaStage);
el('gachaFlipSkip').addEventListener('click',finishTenReveal);
el('gachaFlipNext').addEventListener('click',()=>{
  if(!tenRevealActive||!tenRevealFlipped)return;
  if(tenRevealIndex===9){finishTenReveal();return;}
  tenRevealIndex++;tenRevealFlipped=false;resultKey='';showTenReveal();
});
el('gachaResultClose').addEventListener('click',closeResult);
el('gachaResultDone').addEventListener('click',closeResult);
el('gachaPagePrev').addEventListener('click',()=>{if(resultPage>0){resultPage--;showLatestDraw();}});
el('gachaPageNext').addEventListener('click',()=>{if(resultPage<Math.ceil(latestResults.length/10)-1){resultPage++;showLatestDraw();}});
el('gameFreeDraw').addEventListener('click',()=>void pull('free'));
el('gameCoinDraw').addEventListener('click',()=>void pull('coin'));
el('gameTicketDraw').addEventListener('click',()=>void pull('ticket'));
el('gameTenDraw').addEventListener('click',()=>void pull('multi10'));
el('gameHundredDraw').addEventListener('click',()=>void pull('multi100'));
el('collectionFilter').addEventListener('change',renderCollection);
window.addEventListener('mogumogu:panel',event=>{closeResult();if(event.detail.name==='collection')renderCollection();if(event.detail.name==='home')renderHome();});
window.addEventListener('focus',renderHeader);
window.addEventListener('visibilitychange',()=>{if(!document.hidden)renderHeader();});
setInterval(()=>{if(!document.hidden)renderHeader();},60000);
window.addEventListener('mogumogu:connected',event=>void connect(event.detail.context));
if(bridge&&bridge.getContext())void connect(bridge.getContext());

render();
})();
