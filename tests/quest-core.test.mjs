import assert from 'node:assert/strict';
import {emptyQuests,completeQuest,streakFor,dayBefore,stampForDay,nextMilestone,localDay,cancelToday,setTaskStatus,deleteQuest,activeCount,creditReward,freezeCandidates} from '../quest-core.js';
import {CATALOG} from '../game-catalog.js';
import {detailsForCard} from '../card-details.js';
let q=emptyQuests('jun'),g={coins:0,tickets:0};
for(let i=0;i<10;i++)q.tasks['task'+i]={name:'習慣'+i,archived:false};
let r=completeQuest(q,g,'task0','2026-10-01');assert.equal(r.tickets,0);assert.equal(r.coins,0);
assert.equal(completeQuest(r.quests,r.game,'task0','2026-10-01'),null);
q=r.quests;g=r.game;
for(let i=1;i<10;i++){r=completeQuest(q,g,'task'+i,'2026-10-01');q=r.quests;g=r.game;}
assert.equal(g.coins,40);assert.equal(g.tickets,0);assert.equal(q.days['2026-10-01'].length,10);
r=completeQuest(q,g,'task0','2026-10-02');q=r.quests;g=r.game;
r=completeQuest(q,g,'task0','2026-10-03');q=r.quests;g=r.game;assert.equal(r.coins,15);
assert.equal(streakFor(q.days,null,'2026-10-03'),3);assert.equal(streakFor(q.days,'task1','2026-10-03'),0);
r=completeQuest(q,g,'task1','2026-10-03');assert.equal(r.coins,20);assert.equal(r.tickets,0); // overall milestone cannot pay twice
r=completeQuest(r.quests,r.game,'task1','2026-10-04');assert.equal(streakFor(r.quests.days,null,'2026-10-04'),4);assert.equal(streakFor(r.quests.days,'task0','2026-10-04'),3);
assert.equal(streakFor(r.quests.days,'task0','2026-10-05'),0);
assert.equal(dayBefore('2026-03-01'),'2026-02-28');assert.equal(dayBefore('2024-03-01'),'2024-02-29');
q.tasks.task9.archived=true;assert.equal(completeQuest(q,g,'task9','2026-10-04'),null);assert.equal(completeQuest(q,g,'missing','2026-10-04'),null);
assert.ok(CATALOG.every(c=>{const d=detailsForCard(c);return d.food&&d.story&&d.nutrition&&d.nutrients&&(!c.figure||d.figure)&&(!d.pfc||d.pfc.reduce((a,b)=>a+b,0)===100);}));
const days={};for(let i=0;i<110;i++){const day=new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10);days[day]=['task'+i%2];}
assert.equal(stampForDay(days,'2026-01-01').type,'ordinary');
assert.equal(stampForDay(days,'2026-02-01').type,'month');
assert.equal(stampForDay(days,'2026-04-10').type,'century');
const individual={};for(let i=0;i<35;i++)individual[new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10)]=['task'];
assert.equal(stampForDay(individual,'2026-01-02').type,'habit');
assert.equal(stampForDay(individual,'2026-01-30').type,'habit-month');
assert.equal(stampForDay(individual,'2026-02-08'),null);
assert.deepEqual(nextMilestone(individual,'task','2026-01-02'),{remaining:1,coins:10,target:3});
const marked=emptyQuests('jun');marked.tasks.task={name:'本',archived:false};marked.rewards['local-import:durable-id:2024-01-01']=1;
assert.equal(completeQuest(marked,{coins:0,tickets:0},'task','2026-10-12').quests.rewards['local-import:durable-id:2024-01-01'],1);
const withValue=completeQuest(marked,{coins:50,tickets:3},'task','2026-10-13','2026-10-13T00:00:00Z','52.5kg');
assert.equal(withValue.quests.values['2026-10-13:task'],'52.5kg');
assert.equal(withValue.game.coins,50);
assert.equal(withValue.game.tickets,3);
assert.equal(completeQuest(withValue.quests,withValue.game,'task','2026-10-13',undefined,'another'),null);
assert.equal(localDay(new Date('2026-10-13T15:01:00Z')),'2026-10-14');
assert.equal(CATALOG.length,63);

const now=localDay();
let life=emptyQuests('uid-test'),wallet={coins:0,tickets:0};
life.tasks.walk={name:'歩く',archived:false,fieldLabel:'歩数',fieldType:'number',fieldUnit:'歩'};
let first=completeQuest(life,wallet,'walk',now,new Date().toISOString(),'12.5');
assert.equal(first.quests.valueMeta[now+':walk'].unit,'歩');
assert.equal(first.quests.tasks.walk.totalDone,1);
assert.equal(cancelToday(first.quests,first.game,'walk','2020-01-01'),null);
let undone=cancelToday(first.quests,first.game,'walk',now);
assert.ok(undone);assert.equal(undone.quests.days[now],undefined);
assert.equal(undone.quests.values[now+':walk'],undefined);
assert.equal(undone.quests.rewardEvents[now+':walk'].status,'cancelled');
assert.equal(cancelToday(undone.quests,undone.game,'walk',now),null);
let restored=completeQuest(undone.quests,undone.game,'walk',now);
assert.equal(restored.quests.rewardEvents[now+':walk'].status,'active');
assert.equal(restored.game.coins,first.game.coins);
life=first.quests;
life=setTaskStatus(life,'walk','paused',dayBefore(now));
assert.equal(streakFor(life.days,'walk',now,life),1);
life=setTaskStatus(life,'walk','graduated',now);
assert.equal(activeCount(life),0);
life=setTaskStatus(life,'walk','active',now);
assert.equal(streakFor(life.days,'walk',dayBefore(now),life),0);
assert.equal(streakFor(life.days,'walk',now,life),0); // same-day graduation/restart does not count old completion
assert.equal(life.tasks.walk.totalDone,1);
const deleted=deleteQuest(first.quests,'walk');
assert.equal(deleted.tasks.walk,undefined);
assert.equal(deleted.days[now],undefined);
assert.equal(deleted.values[now+':walk'],undefined);
assert.equal(deleted.rewardEvents[now+':walk'],undefined);
assert.equal(first.game.coins,0);
const bonus=emptyQuests('uid-test');bonus.tasks.a={name:'A'};bonus.tasks.b={name:'B'};
const aDone=completeQuest(bonus,{coins:0,tickets:0},'a',now);
const bDone=completeQuest(aDone.quests,aDone.game,'b',now);
assert.equal(bDone.coins,20);
const spent={...bDone.game,coins:0};
const bCancelled=cancelToday(bDone.quests,spent,'b',now);
assert.equal(bCancelled.game.pendingCoins,20);
creditReward(bCancelled.game,'coins',10);
assert.equal(bCancelled.game.pendingCoins,10);
const bAgain=completeQuest(bCancelled.quests,bCancelled.game,'b',now);
assert.equal(bAgain.game.pendingCoins,0);
assert.equal(bAgain.game.coins,10);

importedTest();
function importedTest(){
  const before={coins:0,tickets:0,pendingCoins:7};
  assert.equal(creditReward(before,'coins',5),0);
  assert.equal(before.pendingCoins,2);
  assert.equal(creditReward(before,'coins',4),2);
  assert.equal(before.pendingCoins,0);
}
const candidate=emptyQuests('uid-test');
candidate.tasks.walk={name:'歩く'};
candidate.days[dayBefore(dayBefore(now))]=['walk'];
assert.equal(freezeCandidates(candidate,now)[0].days.length,1);

console.log('PASS: daily duplicate protection, capped rewards, independent/OR streaks, milestone deduplication, archived tasks, leap dates, all 63 learning descriptions');
