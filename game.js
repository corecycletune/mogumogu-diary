import {CATALOG,BY_ID,levelForCopies,drawCharacter} from './game-catalog.js';
(function(){
'use strict';
const profile=document.body.dataset.profile;
if(!['ichika','jun','sato'].includes(profile))return;
const el=id=>document.getElementById(id);
const bridge=window.MogumoguGameBridge;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const fresh=()=>({profile,version:1,coins:0,tickets:0,drawCount:0,lastFreeDay:'',lastLoginDay:'',loginDays:0,inventory:{},history:[],mealRewardDays:{},streakRewardKeys:[],updatedAt:new Date().toISOString()});
const clone=state=>state?JSON.parse(JSON.stringify(state)):fresh();
let ctx=null,unsubscribe=null,state=fresh(),ready=false,busy=false,lastMealSignature='',statusError='',latestDraw=null,connectionSeq=0;
let testDrawCount=0,testInventory={};
const devAvailable=profile==='jun'&&!!el('devModeToggle')&&/(?:^|[?&])dev=1(?:&|$)/.test(window.location.search);
if(devAvailable)el('devPanel').hidden=false;
function isTesting(){return devAvailable&&el('devModeToggle').checked;}
function testSummary(){
  if(!devAvailable)return;
  el('devDrawCount').textContent='テスト抽選：'+testDrawCount+'回（未保存）';
  el('devConnectionStatus').textContent=!ctx
    ?'本番ガチャ：家族同期に未接続。「きろく」から家族コードで参加してください。'
    :statusError
      ?'本番ガチャ：エラーあり。上部のエラー内容を確認してください。'
      :ready
        ?'本番ガチャ：Firebase接続済み。'
        :'本番ガチャ：接続確認中。接続できない場合は「きろく」の状態を確認してください。';
}
window.mogumoguGameManaged=true;
const rarityRank=['N','R','SR','SSR','UR'];

function message(msg){const x=el('feedback');if(x){x.textContent=msg;x.hidden=false;clearTimeout(message.t);message.t=setTimeout(()=>{x.hidden=true;},3700);}}
function status(msg,error){statusError=error?msg:'';el('gameStatus').textContent=msg;el('gameStatus').classList.toggle('game-error',!!error);}
function setBusy(next){busy=next;renderHeader();}
function gameError(e){
  const code=e&&e.code||e&&e.message||String(e);
  const reason=String(code).includes('permission-denied')
    ?'ゲーム用Firestoreルールが未公開、またはこの端末が家族プロフィールに参加できていない可能性があります。'
    :String(code).includes('unavailable')
      ?'ネットワーク状態やFirebaseの接続を確認してください。'
      :'「きろく」の家族接続を確認してください。';
  status('本番ガチャの保存・読み取りエラー（'+code+'）。'+reason,true);
  renderHeader();
}
function computeStreakRewards(days){
  let streak=0,previous='',events=[];
  for(const date of days){
    streak=previous&&Date.parse(date)-Date.parse(previous)===86400000?streak+1:1;
    if(streak===3||streak===7||streak===14||streak===30)events.push({key:date+':'+streak,streak});
    previous=date;
  }
  return events;
}
function countMeals(records){
  const result={};
  for(const r of records){
    if(r.profile!==profile||r.mealType==='snack'||typeof r.date!=='string'||r.date>today())continue;
    result[r.date]=Math.min(3,(result[r.date]||0)+1);
  }
  return result;
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
async function syncMealRewards(){
  if(!ctx||!bridge||!bridge.confirmedMeals())return;
  const meals=bridge.getCloudMeals();
  const counts=countMeals(meals);
  const sorted=Object.keys(counts).sort();
  const events=computeStreakRewards(sorted);
  const signature=JSON.stringify({counts,events:events.map(x=>x.key)});
  if(signature===lastMealSignature)return;
  lastMealSignature=signature;
  try{
    await ctx.updateGame(current=>{
      const st=clone(current);
      let changed=false;
      for(const date of sorted){
        const n=counts[date],previous=st.mealRewardDays[date]||0;
        if(n<=previous)continue;
        for(let i=previous;i<n;i++)st.coins+=(i===0?20:10);
        st.mealRewardDays[date]=n;changed=true;
      }
      for(const event of events){
        if(st.streakRewardKeys.includes(event.key))continue;
        st.streakRewardKeys.push(event.key);
        if(event.streak===3)st.coins+=30;
        if(event.streak===7)st.tickets+=1;
        if(event.streak===14)st.tickets+=2;
        if(event.streak===30)st.tickets+=3;
        changed=true;
      }
      if(!changed)return null;
      st.updatedAt=new Date().toISOString();return st;
    });
  }catch(e){lastMealSignature='';gameError(e);}
}
async function connect(context){
  if(!context||!context.watchGame)return;
  if(unsubscribe)unsubscribe();
  ctx=context;ready=false;statusError='';lastMealSignature='';latestDraw=null;
  const seq=++connectionSeq;
  state=fresh();render();
  status('ゲームデータをFirebaseから確認しています…');
  unsubscribe=ctx.watchGame((value,meta)=>{
    if(seq!==connectionSeq)return;
    if(value && (value.version!==1||value.profile!==profile)){status('保存されたゲームデータの形式が一致しません。',true);ready=false;render();return;}
    state=value||fresh();
    ready=!meta.fromCache&&!meta.hasPendingWrites;
    if(!statusError)status(ready?'Firebaseにゲームデータを保存しています。':'クラウドとの接続を確認中…');
    render();
  },err=>{if(seq!==connectionSeq)return;ready=false;gameError(err);render();});
  await awardLogin();
  if(seq===connectionSeq)void syncMealRewards();
}
function paintCard(char,entry,unknown){
  const outer=document.createElement('div');
  outer.className='collection-card rarity-'+char.rarity.toLowerCase();
  const art=document.createElement('div');
  art.className='card-art rarity-'+char.rarity.toLowerCase()+' pattern-'+char.background;
  if(entry)art.className+=' evolved-level-'+levelForCopies(entry.copies);
  const glow=document.createElement('span');glow.className='card-shine';art.appendChild(glow);
  const figure=document.createElement('span');figure.className='character-glyph';
  figure.textContent=unknown?'？':char.emoji;art.appendChild(figure);
  const rarity=document.createElement('span');rarity.className='card-rarity';rarity.textContent=char.rarity;art.appendChild(rarity);
  const name=document.createElement('strong');name.className='card-name';name.textContent=unknown?'未発見':char.name;
  const meta=document.createElement('div');meta.className='card-subtitle';
  if(unknown)meta.textContent='まだ出会っていません';
  else if(entry){meta.textContent='Lv.'+levelForCopies(entry.copies)+' · '+entry.copies+'枚所持';}
  else meta.textContent=char.figure?'芸術・歴史モチーフ':'たべもの';
  outer.appendChild(art);outer.appendChild(name);outer.appendChild(meta);
  if(entry){
    const detail=document.createElement('p');detail.className='card-lore';detail.textContent=char.lore;outer.appendChild(detail);
  }
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
    if(filter==='japanese')return !!card.figure&&['葛飾北斎','歌川広重','円山応挙','雪舟','竹久夢二','東洲斎写楽','伊藤若冲','尾形光琳','岡本太郎','草間彌生','棟方志功','横山大観','俵屋宗達'].includes(card.figure);
    return true;
  });
  filtered.sort((a,b)=>rarityRank.indexOf(b.rarity)-rarityRank.indexOf(a.rarity)||a.name.localeCompare(b.name,'ja'));
  for(const card of filtered){
    target.appendChild(paintCard(card,state.inventory[card.id]||null,false));
  }
  if(!filtered.length){const p=document.createElement('p');p.className='empty';p.textContent='ここにはまだカードがありません。';target.appendChild(p);}
  const count=visible.filter(card=>state.inventory[card.id]).length;
  const publiclyCount=CATALOG.filter(x=>x.rarity!=='UR').length;
  el('collectionCount').textContent='図鑑 '+count+' / '+(publiclyCount+visible.filter(x=>x.rarity==='UR').length)+' 種 発見';
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
  testSummary();
}
function showLatestDraw(){
  const target=el('gameResult');target.textContent='';
  if(!latestDraw)return;
  const head=document.createElement('div');head.className='game-win-title';
  head.textContent=latestDraw.test?'🧪 テスト結果（未保存）'
    :latestDraw.newCard?'あたらしい仲間！':'また会えた！ レベルアップに一歩近づいた！';
  target.appendChild(head);
  const stage=document.createElement('div');stage.className='game-reveal';
  const card=BY_ID[latestDraw.id];
  stage.appendChild(paintCard(card,{copies:latestDraw.copies},false));
  target.appendChild(stage);
  const caption=document.createElement('p');caption.className='small';
  caption.textContent=(latestDraw.test?'テスト表示：':'獲得：')+card.name+'（'+card.rarity+'） · '+(latestDraw.test?'仮の重複':'累計')+latestDraw.copies+'枚 / Lv.'+levelForCopies(latestDraw.copies);
  if(latestDraw.test){
    const label=document.createElement('p');
    label.className='game-test-warning';
    label.textContent='これは動作確認です。Firebase・コイン・実際の図鑑には反映されません。';
    target.appendChild(label);
  }
  target.appendChild(caption);
  if(card.rarity==='UR'){
    const secret=document.createElement('p');secret.className='secret-discovery';secret.textContent='✨ ひみつのカードを発見しました！ ✨';target.insertBefore(secret,head);
  }
}
function render(){
  renderHeader();renderCollection();showLatestDraw();
}
function testPull(){
  if(!isTesting()||busy)return;
  const choice=el('devRarity').value;
  let card;
  if(choice==='random')card=drawCharacter();
  else{
    const pool=CATALOG.filter(x=>x.rarity===choice);
    if(!pool.length){message('選択したレア度のキャラクターがありません。');return;}
    const random=new Uint32Array(1);
    crypto.getRandomValues(random);
    card=pool[random[0]%pool.length];
  }
  testInventory[card.id]=(testInventory[card.id]||0)+1;
  testDrawCount++;
  latestDraw={id:card.id,copies:testInventory[card.id],newCard:testInventory[card.id]===1,test:true};
  renderHeader();
  showLatestDraw();
  el('gameResult').scrollIntoView({behavior:'smooth',block:'center'});
}
async function pull(mode){
  if(mode==='free'&&isTesting()){testPull();return;}
  if(busy||!ctx||!ready){message('Firebaseとの接続を確認してください');return;}
  const character=drawCharacter();
  const d=today(),at=new Date().toISOString();
  setBusy(true);
  let chosen=null;
  try{
    const saved=await ctx.updateGame(current=>{
      const st=clone(current);
      if(mode==='free'){if(st.lastFreeDay===d)return null;st.lastFreeDay=d;}
      else if(mode==='coin'){if(st.coins<100)return null;st.coins-=100;}
      else if(mode==='ticket'){if(st.tickets<1)return null;st.tickets-=1;}
      else return null;
      const previous=st.inventory[character.id]||{copies:0};
      const copies=previous.copies+1;
      st.inventory[character.id]={copies,firstObtainedAt:previous.firstObtainedAt||at,lastObtainedAt:at};
      st.drawCount+=1;
      st.history=[{id:character.id,rarity:character.rarity,mode,at},...st.history].slice(0,25);
      st.updatedAt=at;return st;
    });
    if(!saved){message('この無料枠・コイン・ガチャ券は既に使われました。');return;}
    state=saved;
    chosen={id:character.id,copies:saved.inventory[character.id].copies,newCard:saved.inventory[character.id].copies===1};
    latestDraw=chosen;
    render();
    el('gameResult').scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){gameError(e);}
  finally{setBusy(false);}
}
if(devAvailable){
  const toggle=el('devModeToggle');
  toggle.addEventListener('change',()=>{
    el('devControls').hidden=!toggle.checked;
    // Never keep simulated cards after leaving test mode.
    testInventory={};testDrawCount=0;latestDraw=null;
    render();
    if(toggle.checked)message('テストモードです。抽選は何度でもできますが保存されません。');
  });
  el('devReset').addEventListener('click',()=>{
    testDrawCount=0;testInventory={};latestDraw=null;render();
    message('テスト結果をリセットしました。');
  });
}
el('gameFreeDraw').addEventListener('click',()=>void pull('free'));
el('gameCoinDraw').addEventListener('click',()=>void pull('coin'));
el('gameTicketDraw').addEventListener('click',()=>void pull('ticket'));
el('collectionFilter').addEventListener('change',renderCollection);
window.addEventListener('mogumogu:connected',event=>void connect(event.detail.context));
window.addEventListener('mogumogu:meals',()=>void syncMealRewards());
if(bridge&&bridge.getContext())void connect(bridge.getContext());
else status('「きろく」から家族と同期すると、無料ガチャや図鑑を使えます。');
render();
})();