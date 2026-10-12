import {grantMultiRewards} from './multi-draw.js';
import {emptyQuests,localDay} from './quest-core.js';
export function freshGame(profile){return {profile,version:1,coins:0,tickets:0,drawCount:0,lastFreeDay:'',lastLoginDay:'',loginDays:0,inventory:{},history:[],mealRewardDays:{},streakRewardKeys:[],updatedAt:new Date().toISOString()};}
export function mergeLocalProgress(remoteQuests,remoteGame,bundle,profile){
  const q=structuredClone(remoteQuests||emptyQuests(profile)),g=structuredClone(remoteGame||freshGame(profile));
  const marker='local-import:'+bundle.id+':'+localDay();
  if(Object.keys(q.rewards).some(key=>key.startsWith('local-import:'+bundle.id+':')))return null;
  const local=bundle.quests||emptyQuests(profile);
  let active=Object.values(q.tasks).filter(t=>!t.archived).length;
  for(const [id,task] of Object.entries(local.tasks)){
    if(q.tasks[id])continue;
    if(Object.keys(q.tasks).length>=50)throw new Error('habit-capacity');
    q.tasks[id]={...task,archived:task.archived||active>=10};if(!q.tasks[id].archived)active++;
  }
  for(const [day,ids] of Object.entries(local.days))q.days[day]=[...new Set([...(q.days[day]||[]),...ids])];
  const cutoff=Object.keys(q.days).sort().slice(-400);q.days=Object.fromEntries(cutoff.map(day=>[day,q.days[day]]));
  for(const [key,value] of Object.entries(local.rewards))if(!(key in q.rewards))q.rewards[key]=value;
  const earned=bundle.game;
  if(earned){
    g.streakRewardKeys=[...new Set([...(g.streakRewardKeys||[]),...(earned.streakRewardKeys||[])])];
    g.coins+=earned.coins;g.tickets+=earned.tickets;g.drawCount+=earned.drawCount;
    for(const [id,item] of Object.entries(earned.inventory)){
      const old=g.inventory[id];g.inventory[id]={...item,...old,copies:(old?.copies||0)+item.copies,firstObtainedAt:old?.firstObtainedAt||item.firstObtainedAt,lastObtainedAt:[old?.lastObtainedAt||'',item.lastObtainedAt||''].sort().at(-1)};
    }
    g.history=[...g.history,...earned.history].sort((a,b)=>b.at.localeCompare(a.at)).slice(0,25);
    g.lastFreeDay=[g.lastFreeDay,earned.lastFreeDay].sort().at(-1);
    if(g.lastLoginDay===earned.lastLoginDay&&earned.lastLoginDay)g.coins=Math.max(0,g.coins-10);
    g.lastLoginDay=[g.lastLoginDay,earned.lastLoginDay].sort().at(-1);g.loginDays=Math.max(g.loginDays,earned.loginDays);
  }
  grantMultiRewards(g,q.days);
  q.rewards[marker]=1;q.updatedAt=g.updatedAt=new Date().toISOString();return {quests:q,game:g};
}
const contexts=new Map(),pendingImports=new WeakMap();
export function localContext(profile){
  if(contexts.has(profile))return contexts.get(profile);
  const key='mogumogu:progress:'+profile;
  function read(){
    const raw=localStorage.getItem(key);if(raw){const b=JSON.parse(raw);if(b.version!==1||b.profile!==profile)throw new Error('progress-version');return b;}
    return {id:crypto.randomUUID(),version:1,profile,game:null,quests:emptyQuests(profile),importedFamilies:[]};
  }
  let chain=Promise.resolve();
  function change(callback){
    const run=()=>{const b=read(),result=callback(b);if(!result)return null;localStorage.setItem(key,JSON.stringify(b));window.dispatchEvent(new CustomEvent('mogumogu:local-progress',{detail:{profile}}));return result;};
    if(navigator.locks)return navigator.locks.request(key,run);
    const result=chain.then(run);chain=result.catch(()=>{});return result;
  }
  function watch(field,cb,onError){
    const update=()=>{try{cb(read()[field],{fromCache:false,hasPendingWrites:false});}catch(e){onError?.(e);}};
    const event=e=>{if(e.type==='storage'?e.key===key:e.detail.profile===profile)update();};
    window.addEventListener('storage',event);window.addEventListener('mogumogu:local-progress',event);update();
    return ()=>{window.removeEventListener('storage',event);window.removeEventListener('mogumogu:local-progress',event);};
  }
  const ctx={profile,isLocal:true,watchGame:(cb,error)=>watch('game',cb,error),watchQuests:(cb,error)=>watch('quests',cb,error),
    updateGame:callback=>change(b=>{const g=callback(structuredClone(b.game));if(!g)return null;b.game=g;return g;}),
    updateAdventure:callback=>change(b=>{const result=callback(structuredClone(b.quests),structuredClone(b.game));if(!result)return null;b.quests=result.quests;if(result.game)b.game=result.game;return result;}),
    snapshot:()=>structuredClone(read()),markImported:fid=>change(b=>{if(!b.importedFamilies.includes(fid))b.importedFamilies.push(fid);return true;})};
  contexts.set(profile,ctx);return ctx;
}
export function prepareCloudContext(ctx){
  if(ctx.isLocal)return Promise.resolve(ctx);
  if(pendingImports.has(ctx))return pendingImports.get(ctx);
  const promise=(async()=>{
    const local=localContext(ctx.profile),b=local.snapshot();
    if(!b.importedFamilies.includes(ctx.familyId)&&(b.game||Object.keys(b.quests.tasks).length)){
      await ctx.updateAdventure((q,g)=>mergeLocalProgress(q,g,b,ctx.profile));await local.markImported(ctx.familyId);
    }
    return ctx;
  })();pendingImports.set(ctx,promise);promise.catch(()=>pendingImports.delete(ctx));return promise;
}
