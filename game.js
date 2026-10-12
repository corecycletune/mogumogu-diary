import {applyDraw,multiStatus,grantMultiRewards} from './multi-draw.js';
import {initSound,playSound} from './sound.js';
import {localContext,prepareCloudContext,freshGame} from './progress-store.js';
import {openCardDetails,putCardName} from './card-details.js';
import {CATALOG,BY_ID,levelForCopies,drawCharacter} from './game-catalog.js';
import {CARD_LAYER_MANIFEST,pickBackgroundForCard,frameForCard,sceneForRarity,SR_PREMIUM_TRIM,SSR_GOLD_FRAME} from './card-layer-manifest.js';
(function(){
'use strict';
const profile=document.body.dataset.profile;
if(!['ichika','jun','sato'].includes(profile))return;
const el=id=>document.getElementById(id);
const bridge=window.MogumoguGameBridge;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fresh=()=>freshGame(profile);
const clone=state=>state?JSON.parse(JSON.stringify(state)):fresh();
let ctx=null,unsubscribe=null,state=fresh(),ready=false,busy=false,lastMealSignature='',statusError='',latestDraw=null,connectionSeq=0;
let testDrawCount=0,testInventory={};
const devAvailable=profile==='jun'&&!!el('devModeToggle')&&/(?:^|[?&])dev=1(?:&|$)/.test(window.location.search);
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
let latestResults=[],celebrating=false;
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
      st.lastLoginDay=d;st.loginDays+=1;st.coins+=10;st.updatedAt=new Date().toISOString();
      return st;
    });
    if(awarded)message('ログインボーナス ＋10コイン！');
  }catch(e){gameError(e);}
}
async function connect(context){
  if(!context||!context.watchGame)return;
  const seq=++connectionSeq;
  ready=false;renderHeader();
  try{context=await prepareCloudContext(context);}catch(e){if(seq!==connectionSeq)return;message('家族の記録を読み込めませんでした。あとで設定から試してください。');if(!context.isLocal)void connect(localContext(profile));return;}
  if(seq!==connectionSeq)return;
  if(unsubscribe)unsubscribe();
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
  await awardLogin();
  try{await ctx.updateAdventure((q,g)=>{
    if(!q||!g)return null;
    const next=clone(g);if(!grantMultiRewards(next,q.days))return null;
    return {quests:q,game:next};
  });}catch(e){gameError(e);}
}
function paintCard(char,entry,unknown){
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
  outer.addEventListener('click',()=>openCardDetails(char,entry?{copies:entry.copies,level:levelForCopies(entry.copies)}:null,outer.querySelector('.card-art')));
  outer.className='collection-card rarity-'+char.rarity.toLowerCase();
  const art=document.createElement('div');
  art.className='card-art rarity-'+char.rarity.toLowerCase();
  if(entry)art.className+=' evolved-level-'+levelForCopies(entry.copies);
  const layers=CARD_LAYER_MANIFEST[char.id];
  function addLayer(cssClass,src,isDecorative){
    if(!src)return null;
    const img=document.createElement('img');
    img.className='composite-layer '+cssClass;
    img.src=src;
    img.alt=isDecorative?'':char.name+'のキャラクターイラスト';
    img.loading='lazy';
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
    const under=document.createElement('div');
    under.className='composite-layer holo-substrate';
    under.setAttribute('aria-hidden','true');
    art.appendChild(under);
    addLayer('card-background-image',pickBackgroundForCard(char.id,char.rarity),true);
    const foilBase=document.createElement('div');
    foilBase.className='composite-layer composite-foil';
    foilBase.setAttribute('aria-hidden','true');
    art.appendChild(foilBase);
    addLayer('card-scene',sceneForRarity(char.rarity),true);
    addLayer('card-frame-under',layers.lowerFrame,true);
    addLayer('card-portrait',layers.character,false);
    addLayer('card-frame-over',layers.upperFrame,true);
    const glint=document.createElement('div');
    glint.className='composite-layer composite-glint';
    glint.setAttribute('aria-hidden','true');
    art.appendChild(glint);
    }
  }else{
    // All cards receive the same approved raster background and rarity-specific
    // foil. Missing character art stays empty: no SVG or emoji fallback.
    const foilByRarity={N:'none',R:'none',SR:'pearl',SSR:'sunflower',UR:'legendary'};
    art.className+=' layered-card foil-'+(foilByRarity[char.rarity]||'none');
    const substrate=document.createElement('div');
    substrate.className='composite-layer holo-substrate';
    substrate.setAttribute('aria-hidden','true');
    art.appendChild(substrate);
    addLayer('card-background-image',pickBackgroundForCard(char.id,char.rarity),true);
    const foil=document.createElement('div');
    foil.className='composite-layer composite-foil';
    foil.setAttribute('aria-hidden','true');
    art.appendChild(foil);
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
  if(entry){const meta=document.createElement('div');meta.className='card-subtitle';meta.textContent='Lv.'+levelForCopies(entry.copies)+' · '+entry.copies+'枚所持';outer.appendChild(meta);}
  return outer;
}
function renderCollection(){
  const target=el('collectionGrid');target.textContent='';
  const filter=el('collectionFilter').value;
  // UR is not listed or counted until the individual has obtained it.
  const visible=CATALOG.filter(card=>card.rarity!=='UR'||(state.inventory[card.id]&&state.inventory[card.id].copies>0));
  const filtered=visible.filter(card=>{
    if(filter==='owned')return !!state.inventory[card.id];
    if(filter==='missing')return !state.inventory[card.id];
    if(filter==='omurice')return card.food==='オムライス';
    if(filter==='figures')return !!card.figure;
    return true;
  });
  filtered.sort((a,b)=>rarityRank.indexOf(b.rarity)-rarityRank.indexOf(a.rarity)||a.name.localeCompare(b.name,'ja'));
  for(const card of filtered){
    target.appendChild(paintCard(card,state.inventory[card.id]||null,!(state.inventory[card.id]?.copies>0)));
  }
  if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='ここにはまだカードがありません。';target.appendChild(p);}
  const count=visible.filter(card=>state.inventory[card.id]).length;
  const publiclyCount=CATALOG.filter(x=>x.rarity!=='UR').length;
  el('collectionCount').textContent='コレクション '+count+' / '+(publiclyCount+visible.filter(x=>x.rarity==='UR').length)+' 種 発見';
}
function renderHeader(){
  el('coins').textContent=ctx?String(state.coins):'--';
  el('gameCoinCount').textContent=ctx?String(state.coins):'--';
  el('gameTickets').textContent=String(state.tickets);
  el('gamePullCount').textContent=String(state.drawCount);
  const already=state.lastFreeDay===today();
  const testing=isTesting();
  el('gameFreeDraw').disabled=busy||(!testing&&(!ready||already));
  el('gameFreeDraw').textContent=testing?'🧪 テストガチャを引く（回数制限なし）'
    :already?'今日の無料ガチャは引きました':'🎁 今日の無料ガチャを引く';
  // Prevent actual currency or tickets from being spent in testing mode.
  el('gameCoinDraw').disabled=busy||testing||!ready||state.coins<100;
  el('gameTicketDraw').disabled=busy||testing||!ready||state.tickets<1;
  el('gameCoinDraw').textContent='100コインで引く（残高 '+state.coins+'）';
  el('gameTicketDraw').textContent='ガチャ券で引く（'+state.tickets+'枚）';
  for(const size of [10,100]){
    const button=el(size===10?'gameTenDraw':'gameHundredDraw'),value=multiStatus(state,size);
    button.disabled=busy||testing||!ready||value!=='available';
    button.classList.toggle('reward-available',value==='available');
    button.textContent=value==='available'?'🎁 '+size+'連を引く（権利1回分）':value==='used'?'✓ '+size+'連のごほうびは使用済み':'🔒 '+size+'日連続で'+size+'連';
  }
  testSummary();
}
function showLatestDraw(){
  if(celebrating)return;
  const target=el('gameResult');target.replaceChildren();
  const results=latestResults.length?latestResults:latestDraw?[latestDraw]:[];
  if(!results.length)return;
  const head=document.createElement('h3');head.className='game-win-title';
  head.textContent=results[0].test?'🧪 テスト結果（未保存）':results.length>1?results.length+'連のごほうび！':results[0].newCard?'あたらしい仲間！':'また会えた！';
  target.append(head);
  const grid=document.createElement('div');grid.className=results.length>1?'multi-result-grid':'game-reveal';
  for(const result of results){
    const card=BY_ID[result.id],tile=document.createElement('div');tile.className='draw-result reveal-'+card.rarity.toLowerCase();
    const painted=paintCard(card,{copies:result.copies},false);
    if(result.newCard){const badge=document.createElement('span');badge.className='new-badge';badge.textContent='NEW';painted.append(badge);tile.classList.add('first-discovery');}
    tile.append(painted);
    if(!result.test&&['SSR','UR'].includes(card.rarity)){
      const share=document.createElement('button');share.type='button';share.className='btn secondary share-card';share.textContent='家族にゲットを報告';
      share.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('mogumogu:share-card',{detail:{id:card.id}})));tile.append(share);
    }
    grid.append(tile);
  }
  target.append(grid);
  if(results.some(r=>r.test)){const hint=document.createElement('p');hint.className='game-test-warning';hint.textContent='練習ガチャです。コインやコレクションは変わりません。';target.append(hint);}
}
async function preview(){
  celebrating=true;playSound('start');
  const target=el('gameResult');target.replaceChildren();
  const pack=document.createElement('div');pack.className='gacha-pack';pack.textContent='✦';pack.setAttribute('aria-label','パックを開いています');
  const hint=document.createElement('p');hint.textContent='どんな仲間に会えるかな…';target.append(pack,hint);
  target.scrollIntoView({behavior:'smooth',block:'center'});await delay(650);
}
async function reveal(results){
  const rank=Math.max(...results.map(r=>rarityRank.indexOf(BY_ID[r.id].rarity))),rarity=rarityRank[rank];
  el('gameResult').className='gacha-result result-'+rarity.toLowerCase();
  if(rarity==='UR')await delay(400);
  celebrating=false;latestResults=results;latestDraw=results[0];showLatestDraw();
  playSound('reveal',rarity);
  await delay([180,280,420,650,850][rank]);
  if(results.some(r=>r.newCard))playSound('new');
}
function render(){
  renderHeader();renderCollection();showLatestDraw();
}
async function testPull(){
  if(!isTesting()||busy)return;
  const choice=el('devRarity').value;
  const chosenId=el('devCharacter').value;
  let card;
  if(chosenId!=='random'&&BY_ID[chosenId])card=BY_ID[chosenId];
  else if(choice==='random')card=drawCharacter();
  else{
    const pool=CATALOG.filter(x=>x.rarity===choice);
    if(!pool.length){message('選択したレア度のキャラクターがありません。');return;}
    const random=new Uint32Array(1);
    crypto.getRandomValues(random);
    card=pool[random[0]%pool.length];
  }
  setBusy(true);await preview();
  testInventory[card.id]=(testInventory[card.id]||0)+1;
  testDrawCount++;
  latestDraw={id:card.id,copies:testInventory[card.id],newCard:testInventory[card.id]===1,test:true};
  await reveal([latestDraw]);setBusy(false);
  el('gameResult').scrollIntoView({behavior:'smooth',block:'center'});
}
async function pull(mode){
  if(mode==='free'&&isTesting()){void testPull();return;}
  if(busy||!ctx||!ready){message('まだ準備中です。もう一度お試しください。');return;}
  const count=mode==='multi10'?10:mode==='multi100'?100:1;
  // Draw once outside the transaction: retries must keep the same random outcomes.
  const characters=Array.from({length:count},()=>drawCharacter());
  const d=today(),at=new Date().toISOString(),activeContext=ctx,seq=connectionSeq;
  setBusy(true);let displayed=false;
  try{
    await preview();let chosen;
    const saved=await activeContext.updateGame(current=>{
      const result=applyDraw(clone(current),characters,mode,d,at);
      chosen=result?.results;return result?.state||null;
    });
    if(seq!==connectionSeq)return;
    if(!saved){message('この無料枠・コイン・ガチャ券・連続記録の権利は既に使われました。');return;}
    state=saved;await reveal(chosen);displayed=true;renderHeader();renderCollection();
  }catch(e){gameError(e);}
  finally{celebrating=false;setBusy(false);if(!displayed)showLatestDraw();}
}
if(devAvailable){
  const toggle=el('devModeToggle');
  toggle.addEventListener('change',()=>{
    el('devControls').hidden=!toggle.checked;
    // Never keep simulated cards after leaving test mode.
    testInventory={};testDrawCount=0;latestDraw=null;latestResults=[];
    render();
    if(toggle.checked)message('テストモードです。抽選は何度でもできますが保存されません。');
  });
  el('devReset').addEventListener('click',()=>{
    testDrawCount=0;testInventory={};latestDraw=null;latestResults=[];render();
    message('テスト結果をリセットしました。');
  });
}
el('gameFreeDraw').addEventListener('click',()=>void pull('free'));
el('gameCoinDraw').addEventListener('click',()=>void pull('coin'));
el('gameTicketDraw').addEventListener('click',()=>void pull('ticket'));
el('gameTenDraw').addEventListener('click',()=>void pull('multi10'));
el('gameHundredDraw').addEventListener('click',()=>void pull('multi100'));
el('collectionFilter').addEventListener('change',renderCollection);
window.addEventListener('mogumogu:connected',event=>void connect(event.detail.context));
if(bridge&&bridge.getContext())void connect(bridge.getContext());
else void connect(localContext(profile));
render();
})();
