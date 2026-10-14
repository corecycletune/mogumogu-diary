import {emptyQuests} from './quest-core.js';
export function freshGame(profile){return {profile,version:1,coins:0,tickets:0,drawCount:0,lastFreeDay:'',lastLoginDay:'',loginDays:0,inventory:{},history:[],mealRewardDays:{},streakRewardKeys:[],updatedAt:new Date().toISOString()};}
// Per-page test state only. No Firestore, IndexedDB or localStorage writes.
export function sandboxContext(uid){
  let game=null,quests=emptyQuests(uid),chain=Promise.resolve();const watches={game:new Set(),quests:new Set()};
  const meta={fromCache:false,hasPendingWrites:false};
  function emit(field){for(const cb of watches[field])cb(structuredClone(field==='game'?game:quests),meta);}
  function watch(field,cb){watches[field].add(cb);cb(structuredClone(field==='game'?game:quests),meta);return ()=>watches[field].delete(cb);}
  function change(fn){const next=chain.then(fn);chain=next.catch(()=>{});return next;}
  return {uid,profile:uid,isLocal:true,isSandbox:true,ready:async()=>{},
    watchGame:cb=>watch('game',cb),watchQuests:cb=>watch('quests',cb),
    updateGame:cb=>change(()=>{const next=cb(structuredClone(game));if(!next)return null;game=next;emit('game');return next;}),
    updateAdventure:cb=>change(()=>{const next=cb(structuredClone(quests),structuredClone(game));if(!next)return null;quests=next.quests;if(next.game)game=next.game;emit('quests');if(next.game)emit('game');return next;}),
    snapshot:()=>structuredClone({game,quests})};
}
