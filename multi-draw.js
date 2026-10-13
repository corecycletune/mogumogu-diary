const dayBefore=day=>new Date(Date.parse(day+'T00:00:00Z')-86400000).toISOString().slice(0,10);
// Keep the existing game document shape so deployed family rules remain compatible.
export function multiStatus(game,size){
  const keys=game.streakRewardKeys||[];
  return keys.includes('multi:'+size+':used')?'used':keys.includes('multi:'+size+':earned')?'available':'locked';
}
export function grantMultiRewards(game,days){
  const keys=new Set(game.streakRewardKeys||[]);
  let longest=0,length=0,previous='';
  for(const day of Object.keys(days).filter(d=>days[d]?.length).sort()){
    length=previous===dayBefore(day)?length+1:1;previous=day;longest=Math.max(longest,length);
  }
  for(const size of [10,100])if(longest>=size)keys.add('multi:'+size+':earned');
  const changed=keys.size!==(game.streakRewardKeys||[]).length;
  game.streakRewardKeys=[...keys];return changed;
}
export function applyDraw(current,characters,mode,day,at,questDays={}){
  const st=structuredClone(current),size=characters.length;
  // A reward draw requires a quest completed today and can be consumed only once.
  if(mode==='free'){if(!questDays[day]?.length||st.lastFreeDay===day||size!==1)return null;st.lastFreeDay=day;}
  else if(mode==='coin'){if(st.coins<100||size!==1)return null;st.coins-=100;}
  else if(mode==='ticket'){if(st.tickets<1||size!==1)return null;st.tickets-=1;}
  else if(mode==='multi10'||mode==='multi100'){
    const expected=Number(mode.slice(5));
    if(size!==expected||multiStatus(st,expected)!=='available')return null;
    st.streakRewardKeys.push('multi:'+expected+':used');
  }else return null;
  const results=[];
  for(const character of characters){
    const previous=st.inventory[character.id]||{copies:0};
    const copies=previous.copies+1;
    st.inventory[character.id]={copies,firstObtainedAt:previous.firstObtainedAt||at,lastObtainedAt:at};
    results.push({id:character.id,copies,newCard:previous.copies===0});
    st.history.unshift({id:character.id,rarity:character.rarity,mode,at});
  }
  st.history=st.history.slice(0,25);st.drawCount+=size;st.updatedAt=at;
  return {state:st,results};
}
