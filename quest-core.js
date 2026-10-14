import {grantMultiRewards} from './multi-draw.js';
// Reward arithmetic is independent of rendering and Firebase transaction retries.
export const QUEST_BALANCE=Object.freeze({drawCost:100,dailyExtraCap:40,overall:{3:5,7:10,14:15,30:25},individual:{3:10,7:20,14:30,30:50}});
export function localDay(date=new Date()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(p=>[p.type,p.value]));
  return parts.year+'-'+parts.month+'-'+parts.day;
}
export function dayBefore(day){return new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);}
export function emptyQuests(profile){return {profile,version:1,tasks:{},days:{},rewards:{},values:{},deletedTasks:{},updatedAt:new Date().toISOString()};}
export function streakFor(days,taskId,day=localDay()){
  const done=d=>taskId?(days[d]||[]).includes(taskId):(days[d]||[]).length>0;
  let current=done(day)?day:dayBefore(day),count=0;
  while(done(current)){count++;current=dayBefore(current);}
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
export function nextMilestone(days,taskId,day=localDay()){
  const streak=streakFor(days,taskId,day),table=taskId?QUEST_BALANCE.individual:QUEST_BALANCE.overall;
  const target=Object.keys(table).map(Number).find(n=>n>streak);
  return target?{remaining:target-streak,coins:table[target],target}:null;
}
export function completeQuest(quests,game,taskId,day,at=new Date().toISOString(),value=''){
  const q=structuredClone(quests),g=structuredClone(game);
  if(taskId!=='meal'&&(!q.tasks[taskId]||q.tasks[taskId].archived))return null;
  const done=q.days[day]||[];
  if(done.includes(taskId))return null;
  q.days[day]=[...done,taskId];
  if(value&&taskId!=='meal'){
    q.values={...(q.values||{}),[day+':'+taskId]:value};
  }
  let coins=0,tickets=0;
  // Any completion unlocks today's single reward draw; tickets are not accumulated.
  if(done.length){
    const used=q.rewards['extra:'+day]||0;
    coins=Math.min(done.length===1?20:5,QUEST_BALANCE.dailyExtraCap-used);
    q.rewards['extra:'+day]=used+coins;
  }
  for(const [kind,id,table] of [['overall',null,QUEST_BALANCE.overall],['individual',taskId,QUEST_BALANCE.individual]]){
    const streak=streakFor(q.days,id,day),reward=table[streak];
    const key=kind+':'+(id||'any')+':'+day+':'+streak;
    if(reward&&!q.rewards[key]){coins+=reward;q.rewards[key]=reward;}
  }
  grantMultiRewards(g,q.days);
  g.coins+=coins;g.tickets+=tickets;g.updatedAt=at;q.updatedAt=at;
  // Retain over one year's daily streak history; archived task identities stay stable.
  const cutoff=new Date(Date.parse(day+'T00:00:00Z')-399*86400000).toISOString().slice(0,10);
  q.days=Object.fromEntries(Object.entries(q.days).filter(([d])=>d>=cutoff));
  if(q.deletedTasks){const referenced=new Set(Object.values(q.days).flat());q.deletedTasks=Object.fromEntries(Object.entries(q.deletedTasks).filter(([id])=>referenced.has(id)));}
  q.rewards=Object.fromEntries(Object.entries(q.rewards).filter(([key])=>key.startsWith('local-import:')||key.split(':').some(part=>/^\d{4}-\d{2}-\d{2}$/.test(part)&&part>=cutoff)));
  if(q.values)q.values=Object.fromEntries(Object.entries(q.values).filter(([key])=>key.slice(0,10)>=cutoff));
  return {quests:q,game:g,coins,tickets};
}
