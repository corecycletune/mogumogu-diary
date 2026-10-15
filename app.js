(function(){
'use strict';
var profile=window.MogumoguAccount?.uid;
if(!profile){return;}
var mealLabels={breakfast:'朝ごはん',lunch:'昼ごはん',dinner:'夜ごはん',snack:'おやつ'};
var dbPromise;
var allMeals=[];
var month=new Date();month.setDate(1);
var todayDate=localDate(new Date());
var timerKey='mogumogu:timer:'+(window.MogumoguAccount?.uid||profile);
var bonusKey='mogumogu:login:'+profile;
var timer=readJSON(timerKey,null);
var timerTimer;
var timerMealWasEdited=false;

var cloudContext=window.MogumoguAccount?.context||null;
var cloudUnsubscribe=null;
var latestFamilyMeals=[];
var lastCloudMealsConfirmed=false;
var cloudConfirmedIds=new Set();
window.MogumoguGameBridge={
  getContext:function(){return cloudContext;},
  getLocalMeals:function(){return allMeals.filter(function(x){return x.profile===profile;});},
  getCloudMeals:function(){return latestFamilyMeals.filter(function(x){return x&&x.profile===profile;});},
  confirmedMeals:function(){return lastCloudMealsConfirmed;}
};
var lastSavedId=null;
var personalMealChain=Promise.resolve();
function cloudStatus(message){if(el('personalSaveStatus'))el('personalSaveStatus').textContent=message;}
function el(id){return document.getElementById(id);}
function localDate(d){var parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(function(p){return [p.type,p.value];}));return parts.year+'-'+parts.month+'-'+parts.day;}
function localClock(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function validMealTime(value){return typeof value==='string'&&/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);}
function mealDetails(note,time){return {foodNote:note.trim().slice(0,200),mealTime:time};}
function readJSON(k,def){try{var d=JSON.parse(localStorage.getItem(k));return d===null?def:d;}catch(e){return def;}}
function writeJSON(k,v){localStorage.setItem(k,JSON.stringify(v));}
function note(msg){var f=el('feedback');f.textContent=msg;f.hidden=false;clearTimeout(note.t);note.t=setTimeout(function(){f.hidden=true;},3000);}
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(function(resolve,reject){
    if(!window.indexedDB){reject(new Error('IndexedDBが利用できません'));return;}
    var req=indexedDB.open('mogumogu-account-'+profile,1);
    req.onupgradeneeded=function(){var d=req.result;if(!d.objectStoreNames.contains('meals')){d.createObjectStore('meals',{keyPath:'id'});}};
    req.onsuccess=function(){resolve(req.result);};
    req.onerror=function(){reject(req.error);};
  });return dbPromise;
}
async function listAll(){var db=await openDb();return new Promise(function(resolve,reject){var r=db.transaction('meals','readonly').objectStore('meals').getAll();r.onsuccess=function(){resolve(r.result.map(function(x){return {...x,profile:profile};}));};r.onerror=function(){reject(r.error);};});}
async function putMeal(v){var db=await openDb();return new Promise(function(resolve,reject){var tx=db.transaction('meals','readwrite');tx.objectStore('meals').put(v);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});}
async function deleteMeal(id){var db=await openDb();return new Promise(function(resolve,reject){var tx=db.transaction('meals','readwrite');tx.objectStore('meals').delete(id);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error);};});}
function randomId(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);}
function setSnackMode(){
  var snack=el('timerMeal').value==='snack';
  el('snackQuick').hidden=!snack;
  el('timerControls').hidden=snack;
  var manualSnack=el('manualMeal').value==='snack';
  el('manualDurationWrap').hidden=manualSnack;
  el('manualSnackHint').hidden=!manualSnack;
  el('manualMinutes').required=!manualSnack;
  el('manualSubmit').textContent=manualSnack?'おやつを記録する ＋':'記録する ＋';
}
function currentMs(){return timer?timer.accumulatedMs+(timer.running?Math.max(0,Date.now()-timer.runningSince):0):0;}
function fmtTime(sec){sec=Math.max(0,Math.floor(sec));var m=Math.floor(sec/60),s=sec%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function renderTimer(){
  el('clock').textContent=fmtTime(currentMs()/1000);
  setSnackMode();
  el('timerStart').disabled=!!(timer&&timer.running);
  el('timerStart').textContent=timer?'▶ 再開':'▶ スタート';
  el('timerPause').disabled=!(timer&&timer.running);
  el('timerStop').disabled=!timer;
  el('timerMeal').disabled=!!timer;
  el('timerStatus').textContent=!timer?'待機中':timer.running?'計測中':'一時停止';
}
function saveTimer(){if(timer)writeJSON(timerKey,timer);else localStorage.removeItem(timerKey);renderTimer();}
function startTimer(){
  if(!timer&&!timerMealWasEdited){el('timerMeal').value='dinner';setSnackMode();}
  if(!timer&&el('timerMeal').value==='snack'){note('おやつは時間を計測せず記録してください');return;}
  if(!timer){timer={accumulatedMs:0,runningSince:Date.now(),running:true,firstStartedAt:new Date().toISOString(),mealType:el('timerMeal').value};}
  else if(!timer.running){timer.running=true;timer.runningSince=Date.now();}
  saveTimer();
}
function pauseTimer(){if(!timer||!timer.running)return;timer.accumulatedMs=currentMs();timer.running=false;timer.runningSince=null;saveTimer();}
async function stopTimer(){
  if(!timer)return;
  var secs=Math.round(currentMs()/1000);
  if(secs<1){note('1秒以上計測してください');return;}
  var started=new Date(timer.firstStartedAt);
  var item={id:randomId(),profile:profile,mealType:timer.mealType,date:localDate(started),durationSec:secs,source:'timer',startAt:timer.firstStartedAt,endAt:new Date().toISOString(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...mealDetails(el('timerFoodNote').value,localClock(started))};
  try{await storeEntry(item);timer=null;el('timerFoodNote').value='';saveTimer();}catch(e){note('保存に失敗しました。もう一度試してください。');}
}
async function storeEntry(entry){
  if(cloudContext?.isAccount)await cloudContext.saveMeal(entry);
  await putMeal(entry);
  lastSavedId=entry.id;
  await refresh();
  note('今日のごはんを記録しました。');
  el('recentList').scrollIntoView({behavior:'smooth',block:'center'});
}
async function recordSnack(date,time,noteText){
  if(date>localDate(new Date())||!/^\d{4}-\d{2}-\d{2}$/.test(date)){note('日付を確認してください');return;}
  if(!validMealTime(time)){note('食べた時刻を確認してください');return;}
  if(date===localDate(new Date())&&time>localClock(new Date())){note('未来の時刻は記録できません');return;}
  var t=new Date().toISOString();
  try{
    await storeEntry({id:randomId(),profile:profile,mealType:'snack',date:date,durationSec:0,source:'manual',startAt:null,endAt:null,createdAt:t,updatedAt:t,...mealDetails(noteText,time)});
    return true;
  }catch(e){note('おやつを保存できませんでした');return false;}
}
function mealOnly(){return allMeals.filter(function(r){return r.mealType!=='snack';});}
function dailyDates(){return new Set(mealOnly().map(function(r){return r.date;}));}
function numStreak(dates){
  var d=new Date(),today=localDate(d);
  if(!dates.has(today)){d.setDate(d.getDate()-1);}
  var n=0;
  while(dates.has(localDate(d))&&n<36500){n++;d.setDate(d.getDate()-1);}
  return n;
}
function renderMetrics(){
  var day=localDate(new Date());
  var todayMeals=mealOnly().filter(function(r){return r.date===day;});
  el('todayCount').textContent=String(todayMeals.length);
  el('todayMinutes').textContent=String(Math.round(todayMeals.reduce(function(sum,r){return sum+r.durationSec;},0)/60));
  var dates=dailyDates();el('streak').textContent=String(numStreak(dates));
}
function renderCalendar(){
  var y=month.getFullYear(),m=month.getMonth();
  el('monthLabel').textContent=y+'年'+(m+1)+'月';
  var dates=dailyDates();
  Object.keys(window.mogumoguQuestDays||{}).forEach(function(day){if((window.mogumoguQuestDays[day]||[]).length)dates.add(day);});
  var html='';
  var stampDays=Object.assign({},window.mogumoguQuestDays||{});
  mealOnly().forEach(function(r){stampDays[r.date]=Array.from(new Set((stampDays[r.date]||[]).concat(['meal'])));});
  ['日','月','火','水','木','金','土'].forEach(function(s){html+='<div class="weekname">'+s+'</div>';});
  for(var i=0;i<new Date(y,m,1).getDay();i++)html+='<div class="day blank"></div>';
  for(var d=1;d<=new Date(y,m+1,0).getDate();d++){
    var iso=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var stamped=dates.has(iso);
    var stamp=stamped&&window.MogumoguStampForDay?window.MogumoguStampForDay(stampDays,iso):null;
    html+='<button type="button" data-day="'+iso+'" class="day'+(stamped?' marked stamp-'+(stamp?stamp.type:'ordinary'):'')+'" aria-label="'+iso+(stamped?' '+(stamp?stamp.label:'今日できた'):'')+'">'+d+(stamped?'<span class="stamp-symbol" aria-hidden="true">'+(window.MogumoguStampArt?window.MogumoguStampArt(stamp?stamp.type:'ordinary'):(stamp?stamp.symbol:'●'))+'</span>':'')+'</button>';
  }
  el('calendarGrid').innerHTML=html;
  el('nextMonth').disabled=(y>=new Date().getFullYear()&&m>=new Date().getMonth());
}
function historySort(a,b){return b.createdAt.localeCompare(a.createdAt);}
function addRecordRow(target,r,canDelete){
  var item=document.createElement('div');item.className='history-item';
  if(r.id===lastSavedId)item.classList.add('latest-saved');
  var left=document.createElement('div'),title=document.createElement('div');
  title.className='date';title.textContent=r.date+(r.mealTime?' '+r.mealTime:'')+'　'+mealLabels[r.mealType];left.appendChild(title);
  if(r.foodNote){var meta=document.createElement('div');meta.className='meta';meta.textContent=r.foodNote;left.appendChild(meta);}
  var right=document.createElement('div');right.className='right';
  var val=document.createElement('strong');val.textContent=r.mealType==='snack'&&r.durationSec===0?'時間なし':fmtTime(r.durationSec);right.appendChild(val);
  if(canDelete){
    var del=document.createElement('button');del.className='link-button';del.textContent='削除';del.type='button';
    del.addEventListener('click',async function(){
      if(!confirm('この記録を削除しますか？'))return;
      try{
        if(cloudContext?.isAccount)await cloudContext.deleteMeal(r.id);
        await deleteMeal(r.id);
        cloudConfirmedIds.delete(r.id);await refresh();note('記録を削除しました');
      }catch(e){note('削除できませんでした');}
    });
    right.appendChild(document.createElement('br'));right.appendChild(del);
  }
  item.appendChild(left);item.appendChild(right);target.appendChild(item);
}
function renderRecent(){
  var target=el('recentList');target.textContent='';
  var records=allMeals.slice().sort(historySort).slice(0,3);
  if(!records.length){var p=document.createElement('p');p.className='empty';p.textContent='まだ記録がありません。最初の食事を記録しよう！';target.appendChild(p);return;}
  records.forEach(function(r){addRecordRow(target,r,false);});
}
function renderHistory(){
  var sorted=allMeals.slice().sort(historySort);
  var target=el('historyList');target.textContent='';
  if(!sorted.length){var p=document.createElement('p');p.className='empty';p.textContent='まだ記録がありません。最初の食事を記録しよう！';target.appendChild(p);return;}
  sorted.forEach(function(r){addRecordRow(target,r,true);});
}
async function refresh(){allMeals=await listAll();renderMetrics();renderCalendar();renderRecent();renderHistory();window.dispatchEvent(new Event('mogumogu:meals'));}
function validateRecord(r){
  return r&&typeof r.id==='string'&&r.id.length<150&&r.profile===profile&&
  /^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Object.prototype.hasOwnProperty.call(mealLabels,r.mealType)&&
  Number.isFinite(r.durationSec)&&r.durationSec>=0&&r.durationSec<=86400&&(r.mealType==='snack'||r.durationSec>0)&&
  typeof r.createdAt==='string'&&typeof r.updatedAt==='string'&&validMealDetails(r);
}
function validMealDetails(r){
  return (r.foodNote===undefined||(typeof r.foodNote==='string'&&r.foodNote.length<=200))&&
    (r.mealTime===undefined||validMealTime(r.mealTime));
}
async function importData(file){
  if(file.size>2000000){note('ファイルが大きすぎます');return;}
  try{
    var obj=JSON.parse(await file.text());
    if(obj.schemaVersion!==1||obj.profile!==profile||!Array.isArray(obj.meals)||obj.meals.length>5000||!obj.meals.every(validateRecord)){note('この人のバックアップではありません／形式が違います');return;}
    for(var i=0;i<obj.meals.length;i++){if(cloudContext?.isAccount)await cloudContext.saveMeal(obj.meals[i]);await putMeal(obj.meals[i]);}
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
  if(dates.indexOf(today)===-1){dates.push(today);writeJSON(bonusKey,dates);}
}
function changePanel(name){
  document.querySelectorAll('[data-panel]').forEach(function(n){n.hidden=n.dataset.panel!==name;});
  document.querySelectorAll('[data-target]').forEach(function(n){var target=n.dataset.target;var selected=target===name||(n.closest('.game-nav')&&((target==='home'&&name==='timer')||(target==='menu'&&['history','family'].includes(name))));n.setAttribute('aria-selected',String(!!selected));if(n.closest('.game-nav')){if(selected)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');}});
  window.dispatchEvent(new CustomEvent('mogumogu:panel',{detail:{name:name}}));
  window.scrollTo({top:0,behavior:'auto'});
}
window.addEventListener('mogumogu:quest',function(event){window.mogumoguQuestDays=event.detail.days||{};window.mogumoguQuestTasks=event.detail.tasks||{};window.mogumoguDeletedTasks=event.detail.deletedTasks||{};window.mogumoguQuestValues=event.detail.values||{};window.mogumoguQuestValueMeta=event.detail.valueMeta||{};renderCalendar();});
el('calendarGrid').addEventListener('click',function(event){
  var day=event.target.closest('[data-day]')?.dataset.day;if(!day)return;
  var details=el('stampDetails'),list=el('stampDetailsList');
  el('stampDetailsTitle').textContent=day+'の記録';list.replaceChildren();
  (window.mogumoguQuestDays?.[day]||[]).forEach(function(id){
    var item=document.createElement('li'),task=window.mogumoguQuestTasks?.[id]||window.mogumoguDeletedTasks?.[id];
    item.textContent=id==='meal'?'ごはんを記録':(task?.name||'過去の習慣');
    var value=window.mogumoguQuestValues?.[day+':'+id],meta=window.mogumoguQuestValueMeta?.[day+':'+id];if(value!==undefined){var extra=document.createElement('span');extra.textContent=' · '+(meta?.label||task?.fieldLabel||'記録')+'：'+value+(meta?.unit||'');item.append(extra);}
    list.append(item);
  });
  allMeals.filter(function(m){return m.date===day;}).forEach(function(m){
    var item=document.createElement('li');item.textContent=mealLabels[m.mealType]+(m.foodNote?' · '+m.foodNote:'');list.append(item);
  });
  if(!list.children.length){var item=document.createElement('li');item.textContent='記録はありません。';list.append(item);}
  details.showModal();
});
async function init(){
  el('timerMeal').value='dinner';
  el('manualMeal').value='dinner';
  el('manualDate').value=todayDate;el('manualDate').max=todayDate;el('manualTime').value=localClock(new Date());
  el('timerMeal').addEventListener('change',function(){timerMealWasEdited=true;setSnackMode();});
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden&&!timer&&!timerMealWasEdited){
      el('timerMeal').value='dinner';setSnackMode();
    }
  });
  el('manualMeal').addEventListener('change',setSnackMode);
  el('snackNow').addEventListener('click',function(){void recordSnack(localDate(new Date()),localClock(new Date()),el('timerFoodNote').value).then(function(saved){if(saved)el('timerFoodNote').value='';});});
  el('viewFullHistory').addEventListener('click',function(){changePanel('history');});
  setSnackMode();
  if(window.MogumoguAccount.id==='junsakata0720'&&location.hash==='#developer'){changePanel('history');el('devPanel').open=true;window.addEventListener('load',function(){el('devPanel').scrollIntoView({block:'center'});},{once:true});}
  document.querySelectorAll('[data-target]').forEach(function(btn){btn.addEventListener('click',function(){changePanel(btn.dataset.target);});});
  if(window.MogumoguAccount.id==='junsakata0720'&&new URLSearchParams(location.search).get('dev')==='1'&&location.hash==='#ssrPrismTrial'){
    changePanel('history');window.addEventListener('load',function(){el('ssrPrismTrial')?.scrollIntoView({block:'start'});},{once:true});
  }
  el('timerStart').addEventListener('click',startTimer);
  el('timerPause').addEventListener('click',pauseTimer);
  el('timerStop').addEventListener('click',stopTimer);
  el('manualForm').addEventListener('submit',async function(e){
    e.preventDefault();var day=el('manualDate').value,kind=el('manualMeal').value;
    var time=el('manualTime').value,foodNote=el('manualFoodNote').value;
    if(!validMealTime(time)||day===localDate(new Date())&&time>localClock(new Date())){note('食べた時刻を確認してください');return;}
    if(kind==='snack'){if(await recordSnack(day,time,foodNote))el('manualFoodNote').value='';return;}
    var min=Number(el('manualMinutes').value);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>localDate(new Date())||!mealLabels[kind]||!Number.isInteger(min)||min<1||min>240){note('日にちと時間を確認してください');return;}
    var t=new Date().toISOString();
    try{
      var entry={id:randomId(),profile:profile,mealType:kind,date:day,durationSec:min*60,source:'manual',startAt:null,endAt:null,createdAt:t,updatedAt:t,...mealDetails(foodNote,time)};
      await storeEntry(entry);el('manualMinutes').value='';el('manualFoodNote').value='';
    }catch(err){note('保存できませんでした');}
  });
  el('prevMonth').addEventListener('click',function(){month.setMonth(month.getMonth()-1);renderCalendar();});
  el('nextMonth').addEventListener('click',function(){month.setMonth(month.getMonth()+1);renderCalendar();});
  el('exportBtn').addEventListener('click',exportData);
  el('importFile').addEventListener('change',async function(e){if(e.target.files&&e.target.files[0])await importData(e.target.files[0]);e.target.value='';});
  if(timer && (!Number.isFinite(timer.accumulatedMs)||!Object.prototype.hasOwnProperty.call(mealLabels,timer.mealType))){timer=null;saveTimer();}
  if(timer)el('timerMeal').value=timer.mealType;
  renderTimer();timerTimer=setInterval(renderTimer,1000);
  try{await openDb();awardLogin();await refresh();if(cloudContext?.isAccount){
    cloudUnsubscribe=cloudContext.watch(function(records,metadata){
      personalMealChain=personalMealChain.then(async function(){
      latestFamilyMeals=records;lastCloudMealsConfirmed=!!metadata&&!metadata.fromCache;cloudConfirmedIds=new Set(metadata?.confirmedIds||[]);
      if(!lastCloudMealsConfirmed)return;
      var incoming=records.filter(validateRecord),existing=await listAll();
      for(var entry of incoming)await putMeal(entry);
      for(var old of existing)if(!incoming.some(function(x){return x.id===old.id;}))await deleteMeal(old.id);
      await refresh();cloudStatus('DBに保存しています。','接続済み');
      }).catch(function(){cloudStatus('記録を読み込めません。もう一度お試しください。','要確認');});
    },function(){lastCloudMealsConfirmed=false;cloudStatus('DBに接続できません。通信を確認してください。','要確認');});
  }}catch(e){el('offlineNotice').hidden=false;el('offlineNotice').textContent='記録を保存できませんでした。ブラウザの設定を確認してください。';note('記録を保存できませんでした');}
  if('serviceWorker' in navigator){navigator.serviceWorker.register('../../sw.js').catch(function(){});}
}
init();
})();
