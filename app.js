(function(){
'use strict';
var profile=document.body.dataset.profile;
if(!profile){return;}
var allowedProfiles=['ichika','jun','sato'];
if(allowedProfiles.indexOf(profile)===-1){return;}
var mealLabels={breakfast:'朝ごはん',lunch:'昼ごはん',dinner:'夜ごはん',snack:'おやつ'};
var dbPromise;
var allMeals=[];
var month=new Date();month.setDate(1);
var todayDate=localDate(new Date());
var timerKey='mogumogu:timer:'+profile;
var bonusKey='mogumogu:login:'+profile;
var timer=readJSON(timerKey,null);
var timerTimer;

var cloudContext=null;
var cloudUnsubscribe=null;
var cloudSyncing=false;
var latestFamilyMeals=[];
function pendingKey(type){return 'mogumogu:cloud:'+type+':'+profile;}
function pendingList(type){
  var ids=readJSON(pendingKey(type),[]);
  return Array.isArray(ids)?ids:[];
}
function addPending(type,id){
  var ids=pendingList(type);
  if(ids.indexOf(id)===-1){ids.push(id);writeJSON(pendingKey(type),ids);}
}
function clearPending(type,id){
  writeJSON(pendingKey(type),pendingList(type).filter(function(x){return x!==id;}));
}
function cloudStatus(message,badge){
  el('cloudStatus').textContent=message;
  el('cloudBadge').textContent=badge||'確認中';
}
function renderCoop(records){
  var out=el('coopStatus');
  if(!out)return;
  if(!cloudContext){out.textContent='家族で同期すると、3人の記録がここに集まります。';return;}
  var now=new Date(),offset=(now.getDay()+6)%7;
  var monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-offset);
  var start=localDate(monday),end=localDate(now),seen=new Set();
  records.forEach(function(r){
    if(r&&['ichika','jun','sato'].indexOf(r.profile)!==-1&&r.date>=start&&r.date<=end){
      seen.add(r.profile+':'+r.date);
    }
  });
  out.textContent='今週の協力スタンプ '+seen.size+' / 10 個（3人の記録日数の合計）。';
}
async function flushCloudPending(){
  if(!cloudContext||cloudSyncing)return;
  cloudSyncing=true;
  var errors=0;
  try{
    for(var id of pendingList('deletes')){
      try{await cloudContext.deleteMeal(id);clearPending('deletes',id);}
      catch(e){errors++;break;}
    }
    if(!errors){
      var meals=await listAll();
      for(var writeId of pendingList('writes')){
        var item=meals.find(function(r){return r.id===writeId;});
        if(!item){clearPending('writes',writeId);continue;}
        try{await cloudContext.saveMeal(item);clearPending('writes',writeId);}
        catch(e){errors++;break;}
      }
    }
    cloudStatus(errors?'同期できない記録があります。接続設定とネットワークを確認してください。':'クラウドと接続済みです。食事記録は自動同期します。',errors?'要確認':'同期中');
  }finally{cloudSyncing=false;}
}
async function cloudPair(action,code){
  el('cloudCreate').disabled=true;el('cloudJoin').disabled=true;
  cloudStatus('Firebaseに接続しています…','接続中');
  try{
    var lib=await import('./firebase-sync.js');
    var ctx=action==='create'?await lib.createFamily(profile):
      action==='join'?await lib.joinFamily(profile,code):await lib.resumeFamily(profile);
    if(!ctx){cloudStatus('まだ家族グループに参加していません。','未接続');return;}
    if(cloudUnsubscribe)cloudUnsubscribe();
    cloudContext=ctx;
    el('cloudSetup').hidden=true;
    el('cloudConnected').hidden=false;
    el('cloudFamilyCode').textContent=ctx.familyId;
    cloudStatus('この端末の記録をクラウドに送っています…','同期中');
    // Migrate historical records once; use stable document IDs so retries are idempotent.
    var marker='mogumogu:cloud:migrated:'+profile+':'+ctx.familyId;
    if(localStorage.getItem(marker)!=='yes'){
      var local=await listAll();
      for(var entry of local){await ctx.saveMeal(entry);}
      localStorage.setItem(marker,'yes');
    }
    await flushCloudPending();
    cloudUnsubscribe=ctx.watch(async function(records){
      latestFamilyMeals=records;
      var own=records.filter(function(x){return x.profile===profile&&validateRecord(x);});
      try{
        var local=await listAll(),dirty=pendingList('writes'),deleted=pendingList('deletes');
        for(var incoming of own){
          if(dirty.indexOf(incoming.id)!==-1||deleted.indexOf(incoming.id)!==-1)continue;
          var old=local.find(function(x){return x.id===incoming.id;});
          if(!old||incoming.updatedAt>old.updatedAt){await putMeal(incoming);}
        }
        await refresh();
        renderCoop(records);
        if(!pendingList('writes').length&&!pendingList('deletes').length){
          cloudStatus('接続済み：この家族グループの食事記録を同期しています。','接続済み');
        }
      }catch(e){cloudStatus('一部の記録を端末に反映できませんでした。','要確認');}
    },function(err){cloudStatus('Firebaseから読み取れません。Firestoreルールを確認してください。','要確認');});
    renderCoop(latestFamilyMeals);
  }catch(error){
    var message=String(error&&error.code||error&&error.message||error);
    cloudStatus('接続できませんでした（'+message+'）。Firebaseの匿名認証・Firestore・ルールを確認してください。','未接続');
  }finally{
    el('cloudCreate').disabled=false;el('cloudJoin').disabled=false;
  }
}
function el(id){return document.getElementById(id);}
function localDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function readJSON(k,def){try{var d=JSON.parse(localStorage.getItem(k));return d===null?def:d;}catch(e){return def;}}
function writeJSON(k,v){localStorage.setItem(k,JSON.stringify(v));}
function note(msg){var f=el('feedback');f.textContent=msg;f.hidden=false;clearTimeout(note.t);note.t=setTimeout(function(){f.hidden=true;},3000);}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(function(resolve,reject){
    if(!window.indexedDB){reject(new Error('IndexedDBが利用できません'));return;}
    var req=indexedDB.open('mogumogu-diary',1);
    req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains('meals')){d.createObjectStore('meals',{keyPath:'id'});}};
    req.onsuccess=function(){resolve(req.result);};
    req.onerror=function(){reject(req.error);};
  });return dbPromise;
}
async function listAll(){var db=await openDb();return new Promise(function(resolve,reject){var r=db.transaction('meals','readonly').objectStore('meals').getAll();r.onsuccess=function(){resolve(r.result.filter(function(x){return x.profile===profile;}));};r.onerror=function(){reject(r.error);};});}
async function putMeal(v){var db=await openDb();return new Promise(function(resolve,reject){var tx=db.transaction('meals','readwrite');tx.objectStore('meals').put(v);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});}
async function deleteMeal(id){var db=await openDb();return new Promise(function(resolve,reject){var tx=db.transaction('meals','readwrite');tx.objectStore('meals').delete(id);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});}
function randomId(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);}
function guessMeal(){var h=new Date().getHours();return h<10?'breakfast':h<15?'lunch':h<21?'dinner':'snack';}
function currentMs(){return timer?timer.accumulatedMs+(timer.running?Math.max(0,Date.now()-timer.runningSince):0):0;}
function fmtTime(sec){sec=Math.max(0,Math.floor(sec));var m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function renderTimer(){
  el('clock').textContent=fmtTime(currentMs()/1000);
  el('timerStart').disabled=!!(timer&&timer.running);
  el('timerStart').textContent=timer?'▶ 再開':'▶ スタート';
  el('timerPause').disabled=!(timer&&timer.running);
  el('timerStop').disabled=!timer;
  el('timerMeal').disabled=!!timer;
  el('timerStatus').textContent=!timer?'待機中':timer.running?'計測中':'一時停止';
}
function saveTimer(){if(timer)writeJSON(timerKey,timer);else localStorage.removeItem(timerKey);renderTimer();}
function startTimer(){
  if(!timer){timer={accumulatedMs:0,runningSince:Date.now(),running:true,firstStartedAt:new Date().toISOString(),mealType:el('timerMeal').value};}
  else if(!timer.running){timer.running=true;timer.runningSince=Date.now();}
  saveTimer();
}
function pauseTimer(){if(!timer||!timer.running)return;timer.accumulatedMs=currentMs();timer.running=false;timer.runningSince=null;saveTimer();}
async function stopTimer(){
  if(!timer)return;
  var secs=Math.round(currentMs()/1000);
  if(secs<1){note('1秒以上計測してください');return;}
  var item={id:randomId(),profile:profile,mealType:timer.mealType,date:localDate(new Date(timer.firstStartedAt)),durationSec:secs,source:'timer',startAt:timer.firstStartedAt,endAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  try{await putMeal(item);addPending('writes',item.id);timer=null;saveTimer();await refresh();void flushCloudPending();note('食事を記録しました！');}catch(e){note('保存に失敗しました。もう一度試してください。');}
}
function dailyDates(){return new Set(allMeals.map(function(r){return r.date;}));}
function numStreak(dates){
  var d=new Date(),today=localDate(d);
  if(!dates.has(today)){d.setDate(d.getDate()-1);}
  var n=0;
  while(dates.has(localDate(d))&&n<36500){n++;d.setDate(d.getDate()-1);}
  return n;
}
function renderMetrics(){
  var day=localDate(new Date());
  var todayMeals=allMeals.filter(function(r){return r.date===day;});
  el('todayCount').textContent=String(todayMeals.length);
  el('todayMinutes').textContent=String(Math.round(todayMeals.reduce(function(sum,r){return sum+r.durationSec;},0)/60));
  var dates=dailyDates();el('streak').textContent=String(numStreak(dates));
  el('markedDays').textContent=String(dates.size);
  var logins=readJSON(bonusKey,[]);
  if(!Array.isArray(logins))logins=[];
  el('bonusDays').textContent=String(logins.length);
  var grouped={};
  allMeals.forEach(function(m){grouped[m.date]=(grouped[m.date]||0)+1;});
  var coins=logins.length*10+Object.keys(grouped).reduce(function(s,k){return s+(grouped[k]>=1?20:0)+(grouped[k]>=2?10:0)+(grouped[k]>=3?10:0);},0);
  el('coins').textContent=String(coins);
}
function renderCalendar(){
  var y=month.getFullYear(),m=month.getMonth();
  el('monthLabel').textContent=y+'年'+(m+1)+'月';
  var dates=dailyDates();
  var html='';
  ['日','月','火','水','木','金','土'].forEach(function(s){html+='<div class="weekname">'+s+'</div>';});
  for(var i=0;i<new Date(y,m,1).getDay();i++)html+='<div class="day blank"></div>';
  for(var d=1;d<=new Date(y,m+1,0).getDate();d++){
    var iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var stamped=dates.has(iso);
    html+='<div class="day'+(stamped?' marked':'')+'" aria-label="'+iso+(stamped?' 記録あり':' 記録なし')+'">'+d+'</div>';
  }
  el('calendarGrid').innerHTML=html;
  el('nextMonth').disabled=(y>=new Date().getFullYear()&&m>=new Date().getMonth());
}
function renderHistory(){
  var sorted=allMeals.slice().sort(function(a,b){return b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt);});
  var target=el('historyList');target.textContent='';
  if(!sorted.length){var p=document.createElement('p');p.className='empty';p.textContent='まだ記録がありません。最初の食事を記録しよう！';target.appendChild(p);return;}
  sorted.forEach(function(r){
    var item=document.createElement('div');item.className='history-item';
    var left=document.createElement('div');var title=document.createElement('div');title.className='date';title.textContent=r.date+'　'+mealLabels[r.mealType];left.appendChild(title);
    var meta=document.createElement('div');meta.className='meta';meta.textContent=r.source==='timer'?'タイマー':'あとから入力';left.appendChild(meta);
    var right=document.createElement('div');right.className='right';var val=document.createElement('strong');val.textContent=fmtTime(r.durationSec);right.appendChild(val);
    var del=document.createElement('button');del.className='link-button';del.textContent='削除';del.type='button';
    del.addEventListener('click',async function(){if(!confirm('この食事記録を削除しますか？'))return;try{await deleteMeal(r.id);clearPending('writes',r.id);addPending('deletes',r.id);await refresh();void flushCloudPending();note('削除しました');}catch(e){note('削除できませんでした');}});
    right.appendChild(document.createElement('br'));right.appendChild(del);item.appendChild(left);item.appendChild(right);target.appendChild(item);
  });
}
async function refresh(){allMeals=await listAll();renderMetrics();renderCalendar();renderHistory();}
function validateRecord(r){
  return r&&typeof r.id==='string'&&r.id.length<150&&r.profile===profile&&
  /^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Object.prototype.hasOwnProperty.call(mealLabels,r.mealType)&&
  Number.isFinite(r.durationSec)&&r.durationSec>0&&r.durationSec<=86400&&
  typeof r.createdAt==='string'&&typeof r.updatedAt==='string';
}
async function importData(file){
  if(file.size>2000000){note('ファイルが大きすぎます');return;}
  try{
    var obj=JSON.parse(await file.text());
    if(obj.schemaVersion!==1||obj.profile!==profile||!Array.isArray(obj.meals)||obj.meals.length>5000||!obj.meals.every(validateRecord)){note('この人のバックアップではありません／形式が違います');return;}
    for(var i=0;i<obj.meals.length;i++){await putMeal(obj.meals[i]);addPending('writes',obj.meals[i].id);}void flushCloudPending();
    await refresh();note(obj.meals.length+'件を読み込みました');
  }catch(e){note('バックアップを読み込めませんでした');}
}
function exportData(){
  var body=JSON.stringify({schemaVersion:1,profile:profile,exportedAt:new Date().toISOString(),meals:allMeals},null,2);
  var blob=new Blob([body],{type:'application/json'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mogumogu-'+profile+'-'+localDate(new Date())+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},5000);
}
function awardLogin(){
  var dates=readJSON(bonusKey,[]);
  if(!Array.isArray(dates))dates=[];
  var today=localDate(new Date());
  if(dates.indexOf(today)===-1){dates.push(today);writeJSON(bonusKey,dates);note('今日のログインボーナス +10コイン！');}
}
function changePanel(name){
  document.querySelectorAll('[data-panel]').forEach(function(n){n.hidden=n.dataset.panel!==name;});
  document.querySelectorAll('[data-target]').forEach(function(n){n.setAttribute('aria-selected',String(n.dataset.target===name));});
}
async function init(){
  el('timerMeal').value=guessMeal();
  el('manualDate').value=todayDate;el('manualDate').max=todayDate;
  document.querySelectorAll('[data-target]').forEach(function(btn){btn.addEventListener('click',function(){changePanel(btn.dataset.target);});});
  el('cloudCreateRow').hidden=profile!=='jun';
  el('cloudCreate').addEventListener('click',function(){if(confirm('新しい家族グループを作りますか？（最初の1回だけ）'))void cloudPair('create');});
  el('cloudJoin').addEventListener('click',function(){var c=el('cloudCode').value.trim();if(!c){note('家族コードを入力してください');return;}void cloudPair('join',c);});
  el('cloudRetry').addEventListener('click',function(){void cloudPair('resume');});
  el('cloudCopy').addEventListener('click',async function(){try{await navigator.clipboard.writeText(el('cloudFamilyCode').textContent);note('家族コードをコピーしました');}catch(e){note('家族コードを長押ししてコピーしてください');}});
  window.addEventListener('online',function(){void flushCloudPending();});
  el('timerStart').addEventListener('click',startTimer);
  el('timerPause').addEventListener('click',pauseTimer);
  el('timerStop').addEventListener('click',stopTimer);
  el('manualForm').addEventListener('submit',async function(e){
    e.preventDefault();var day=el('manualDate').value,kind=el('manualMeal').value,min=Number(el('manualMinutes').value);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>localDate(new Date())||!mealLabels[kind]||!Number.isInteger(min)||min<1||min>240){note('日にちと時間を確認してください');return;}
    var t=new Date().toISOString();
    try{var entry={id:randomId(),profile:profile,mealType:kind,date:day,durationSec:min*60,source:'manual',startAt:null,endAt:null,createdAt:t,updatedAt:t};await putMeal(entry);addPending('writes',entry.id);el('manualMinutes').value='';await refresh();void flushCloudPending();note('食事を記録しました！');}catch(err){note('保存できませんでした');}
  });
  el('prevMonth').addEventListener('click',function(){month.setMonth(month.getMonth()-1);renderCalendar();});
  el('nextMonth').addEventListener('click',function(){month.setMonth(month.getMonth()+1);renderCalendar();});
  el('exportBtn').addEventListener('click',exportData);
  el('importFile').addEventListener('change',async function(e){if(e.target.files&&e.target.files[0])await importData(e.target.files[0]);e.target.value='';});
  if(timer && (!Number.isFinite(timer.accumulatedMs)||!Object.prototype.hasOwnProperty.call(mealLabels,timer.mealType))){timer=null;saveTimer();}
  if(timer)el('timerMeal').value=timer.mealType;
  renderTimer();timerTimer=setInterval(renderTimer,1000);
  try{await openDb();awardLogin();await refresh();var remembered=localStorage.getItem('mogumogu:family:'+profile);if(remembered)void cloudPair('resume');}catch(e){el('offlineNotice').textContent='このブラウザでは記録用ストレージを利用できません。プライベートブラウズを解除して再試行してください。';note('端末内保存が利用できません');}
  if('serviceWorker' in navigator){navigator.serviceWorker.register('../../sw.js').catch(function(){});}
}
init();
})();