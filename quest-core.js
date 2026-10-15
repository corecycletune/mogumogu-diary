import {grantMultiRewards} from './multi-draw.js';
// Reward arithmetic is independent of rendering and Firebase transaction retries.
export const QUEST_BALANCE=Object.freeze({drawCost:100,dailyExtraCap:40,overall:{3:5,7:10,14:15,30:25},individual:{3:10,7:20,14:30,30:50}});
export function localDay(date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
export function dayBefore(day){return new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);}
export function emptyQuests(profile){return {profile,version:1,tasks:{},days:{},rewards:{},values:{},deletedTasks:{},rewardEvents:{},valueMeta:{},freezeDays:{},updatedAt:new Date().toISOString()};}
export function taskStatus(task){return task?.status||(task?.archived?'paused':'active');}
export function activeCount(q){return Object.values(q.tasks||{}).filter(t=>taskStatus(t)!=='graduated').length;}
export function isPausedDay(task,day){return !!task?.pauseDays?.[day]||!!task?.pausePeriods?.some(p=>p.start<=day&&(!p.end||day<=p.end));}
export function streakFor(days,taskId,day=localDay(),quests=null){
  const task=taskId?quests?.tasks?.[taskId]:null;
  const done=d=>taskId?((days[d]||[]).includes(taskId)&&task?.resumeIgnoreDay!==d):(days[d]||[]).length>0;
  let current=done(day)||isPausedDay(task,day)?day:dayBefore(day),count=0;
  for(let i=0;i<10000;i++){
    if(task?.segmentStart&&current<task.segmentStart)break;
    if(done(current))count++;
    else if(!isPausedDay(task,current))break;
    current=dayBefore(current);
  }
  return count;
}
export function stampForDay(days,day){
  if(!(days[day]||[]).length)return null;
  const overall=streakFor(days,null,day),individual=Math.max(...(days[day]||[]).map(id=>streakFor(days,id,day)));
  if(overall>=100)return {type:'century',symbol:'👑',label:'100日以上つづいた'};
  if(individual>=30)return {type:'habit-month',symbol:'💎',label:'ひとつの習慣を30日以上'};
  if(overall>30)return {type:'month',symbol:'🌟',label:'どれかを1か月以上'};
  if(individual>=2)return {type:'habit',symbol:'🌿',label:'同じ習慣がつづいた'};
  return {type:'ordinary',symbol:'●',label:'今日できた'};
}
export function nextMilestone(days,taskId,day=localDay(),quests=null){
  const streak=streakFor(days,taskId,day,quests),table=taskId?QUEST_BALANCE.individual:QUEST_BALANCE.overall;
  const target=Object.keys(table).map(Number).find(n=>n>streak);
  return target?{remaining:target-streak,coins:table[target],target}:null;
}

export function totalDone(q,id){return Math.max(q.tasks?.[id]?.totalDone||0,Object.values(q.days||{}).filter(ids=>ids.includes(id)).length);}
export function bestStreak(q,id){
  const t=q.tasks?.[id],dates=Object.keys(q.days||{}).filter(day=>q.days[day].includes(id)).sort();
  let best=t?.bestStreak||0,run=0,previous='';
  for(const day of dates){
    let connected=previous&&dayBefore(day)===previous;
    if(previous&&!connected){let cursor=dayBefore(day),steps=0;connected=true;while(cursor>previous&&steps++<5000){if(!isPausedDay(t,cursor)){connected=false;break;}cursor=dayBefore(cursor);}}
    run=connected?run+1:1;best=Math.max(best,run);previous=day;
  }
  return best;
}
export function creditReward(game,kind,amount){
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('invalid-reward');
  const field=kind==='tickets'?'tickets':'coins',debt=kind==='tickets'?'pendingTickets':'pendingCoins';
  const owed=Math.max(0,game[debt]||0),offset=Math.min(owed,amount);
  game[debt]=owed-offset;game[field]=(game[field]||0)+amount-offset;return amount-offset;
}
export function reclaimReward(game,kind,amount){
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error('invalid-reward');
  const field=kind==='tickets'?'tickets':'coins',debt=kind==='tickets'?'pendingTickets':'pendingCoins';
  const taken=Math.min(game[field]||0,amount);
  game[field]-=taken;game[debt]=(game[debt]||0)+(amount-taken);
}
export function cancelToday(quests,game,taskId,day=localDay()){
  if(day!==localDay()||taskId==='meal'||!(quests.days?.[day]||[]).includes(taskId))return null;
  const q=structuredClone(quests),g=structuredClone(game),key=day+':'+taskId;
  q.days[day]=q.days[day].filter(id=>id!==taskId);
  if(!q.days[day].length)delete q.days[day];
  delete q.values?.[key];delete q.valueMeta?.[key];
  if(q.tasks[taskId]){q.tasks[taskId].totalDone=Math.max(0,(q.tasks[taskId].totalDone||0)-1);if(q.tasks[taskId].resumeIgnoreDay===day)delete q.tasks[taskId].resumeIgnoreDay;}
  const event=q.rewardEvents?.[key];
  if(event?.status==='active'){
    reclaimReward(g,'coins',event.coins||0);reclaimReward(g,'tickets',event.tickets||0);
    q.rewardEvents[key]={...event,status:'cancelled'};
  }
  q.updatedAt=g.updatedAt=new Date().toISOString();
  return {quests:q,game:g,coins:event?.status==='active'?event.coins||0:0,tickets:event?.status==='active'?event.tickets||0:0};
}
export function setTaskStatus(quests,id,status,day=localDay()){
  if(!['active','paused','graduated'].includes(status)||!quests.tasks?.[id])return null;
  const q=structuredClone(quests),t=q.tasks[id],before=taskStatus(t);
  if(before===status||before==='graduated'&&status==='paused')return null;
  if(status==='active'&&before==='graduated'&&activeCount(q)>=10)throw new Error('limit');
  if(status==='paused')t.pausePeriods=[...(t.pausePeriods||[]),{start:day}];
  else if(before==='paused'){
    const last=t.pausePeriods?.at(-1);
    if(last&&!last.end)last.end=dayBefore(day);
    if(!(q.days[day]||[]).includes(id))t.pauseDays={...(t.pauseDays||{}),[day]:true};
  }
  if(status==='graduated'){
    t.graduatedAt=day;t.bestStreak=bestStreak(q,id);t.totalDone=totalDone(q,id);
  }
  if(before==='graduated'&&status==='active'){t.segmentStart=day;if((q.days[day]||[]).includes(id))t.resumeIgnoreDay=day;else delete t.resumeIgnoreDay;delete t.graduatedAt;}
  t.status=status;t.archived=status!=='active';q.updatedAt=new Date().toISOString();return q;
}
export function deleteQuest(quests,id){
  if(!quests.tasks?.[id])return null;
  const q=structuredClone(quests);delete q.tasks[id];delete q.deletedTasks?.[id];
  for(const [day,ids] of Object.entries(q.days))if(ids.includes(id)){
    q.days[day]=ids.filter(item=>item!==id);if(!q.days[day].length)delete q.days[day];
  }
  for(const field of ['values','valueMeta','rewardEvents'])for(const key of Object.keys(q[field]||{}))if(key.endsWith(':'+id))delete q[field][key];
  q.updatedAt=new Date().toISOString();return q;
}
export function freezeCandidates(q,day=localDay()){
  const result=[];
  for(const [id,task] of Object.entries(q.tasks||{})){
    if(taskStatus(task)==='graduated')continue;
    const missing=[];let cursor=dayBefore(day);
    for(let i=1;i<=5;i++,cursor=dayBefore(cursor)){
      if((q.days[cursor]||[]).includes(id)||isPausedDay(task,cursor))break;
      missing.push(cursor);
    }
    if(missing.length&&((q.days[cursor]||[]).includes(id)||isPausedDay(task,cursor)))result.push({id,days:missing});
  }
  return result;
}

export function completeQuest(quests,game,taskId,day,at=new Date().toISOString(),value=''){
  const q=structuredClone(quests),g=structuredClone(game);
  if(taskId!=='meal'&&(!q.tasks[taskId]||taskStatus(q.tasks[taskId])!=='active'))return null;
  const done=q.days[day]||[];
  if(done.includes(taskId))return null;
  q.days[day]=[...done,taskId];
  if(taskId!=='meal'){
    const t=q.tasks[taskId];
    if(t.pauseDays)delete t.pauseDays[day];
    t.totalDone=Math.max(t.totalDone||0,Object.values(q.days).filter(ids=>ids.includes(taskId)).length);
    t.bestStreak=Math.max(t.bestStreak||0,streakFor(q.days,taskId,day,q));
    if(value!==''){
      q.values={...(q.values||{}),[day+':'+taskId]:String(value)};
      q.valueMeta={...(q.valueMeta||{}),[day+':'+taskId]:{label:t.fieldLabel||'',type:t.fieldType||'text',unit:t.fieldUnit||''}};
    }
  }
  let coins=0,tickets=0;
  q.rewardEvents=q.rewardEvents||{};
  const eventKey=day+':'+taskId,prior=q.rewardEvents[eventKey];
  // Any completion unlocks today's single reward draw; tickets are not accumulated.
  if(prior?.status==='cancelled'){coins=prior.coins||0;tickets=prior.tickets||0;}
  else if(done.length){
    const used=q.rewards['extra:'+day]||0;
    coins=Math.min(done.length===1?20:5,QUEST_BALANCE.dailyExtraCap-used);
    q.rewards['extra:'+day]=used+coins;
  }
  if(prior?.status!=='cancelled')for(const [kind,id,table] of [['overall',null,QUEST_BALANCE.overall],['individual',taskId,QUEST_BALANCE.individual]]){
    const streak=streakFor(q.days,id,day,q),reward=table[streak];
    const key=kind+':'+(id||'any')+':'+day+':'+streak;
    if(reward&&!q.rewards[key]){coins+=reward;q.rewards[key]=reward;}
  }
  q.rewardEvents[eventKey]={coins,tickets,status:'active'};
  grantMultiRewards(g,q.days);
  creditReward(g,'coins',coins);creditReward(g,'tickets',tickets);g.updatedAt=at;q.updatedAt=at;
  // Lifetime history is retained; storage limits require a future paginated archive.
  return {quests:q,game:g,coins,tickets};
}
