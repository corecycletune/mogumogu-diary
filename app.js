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
  try{await putMeal(item);timer=null;saveTimer();await refresh();note('食事を記録しました！');}catch(e){note('保存に失敗しました。もう一度試してください。');}
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
    del.addEventListener('click',async function(){if(!confirm('この食事記録を削除しますか？'))return;try{await deleteMeal(r.id);await refresh();note('削除しました');}catch(e){note('削除できませんでした');}});
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
    for(var i=0;i<obj.meals.length;i++)await putMeal(obj.meals[i]);
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
  el('timerStart').addEventListener('click',startTimer);
  el('timerPause').addEventListener('click',pauseTimer);
  el('timerStop').addEventListener('click',stopTimer);
  el('manualForm').addEventListener('submit',async function(e){
    e.preventDefault();var day=el('manualDate').value,kind=el('manualMeal').value,min=Number(el('manualMinutes').value);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>localDate(new Date())||!mealLabels[kind]||!Number.isInteger(min)||min<1||min>240){note('日にちと時間を確認してください');return;}
    var t=new Date().toISOString();
    try{await putMeal({id:randomId(),profile:profile,mealType:kind,date:day,durationSec:min*60,source:'manual',startAt:null,endAt:null,createdAt:t,updatedAt:t});el('manualMinutes').value='';await refresh();note('食事を記録しました！');}catch(err){note('保存できませんでした');}
  });
  el('prevMonth').addEventListener('click',function(){month.setMonth(month.getMonth()-1);renderCalendar();});
  el('nextMonth').addEventListener('click',function(){month.setMonth(month.getMonth()+1);renderCalendar();});
  el('exportBtn').addEventListener('click',exportData);
  el('importFile').addEventListener('change',async function(e){if(e.target.files&&e.target.files[0])await importData(e.target.files[0]);e.target.value='';});
  if(timer && (!Number.isFinite(timer.accumulatedMs)||!Object.prototype.hasOwnProperty.call(mealLabels,timer.mealType))){timer=null;saveTimer();}
  if(timer)el('timerMeal').value=timer.mealType;
  renderTimer();timerTimer=setInterval(renderTimer,1000);
  try{await openDb();awardLogin();await refresh();}catch(e){el('offlineNotice').textContent='このブラウザでは記録用ストレージを利用できません。プライベートブラウズを解除して再試行してください。';note('端末内保存が利用できません');}
  if('serviceWorker' in navigator){navigator.serviceWorker.register('../../sw.js').catch(function(){});}
}
init();
})();