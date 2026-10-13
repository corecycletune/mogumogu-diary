import assert from 'node:assert/strict';
import {emptyQuests,completeQuest,streakFor,dayBefore,stampForDay,nextMilestone} from '../quest-core.js';
import {CATALOG} from '../game-catalog.js';
import {detailsForCard} from '../card-details.js';
let q=emptyQuests('jun'),g={coins:0,tickets:0};
for(let i=0;i<10;i++)q.tasks['task'+i]={name:'習慣'+i,archived:false};
let r=completeQuest(q,g,'task0','2026-10-01');assert.equal(r.tickets,1);assert.equal(r.coins,0);
assert.equal(completeQuest(r.quests,r.game,'task0','2026-10-01'),null);
q=r.quests;g=r.game;
for(let i=1;i<10;i++){r=completeQuest(q,g,'task'+i,'2026-10-01');q=r.quests;g=r.game;}
assert.equal(g.coins,40);assert.equal(g.tickets,10);assert.equal(q.days['2026-10-01'].length,10);
r=completeQuest(q,g,'task0','2026-10-02');q=r.quests;g=r.game;
r=completeQuest(q,g,'task0','2026-10-03');q=r.quests;g=r.game;assert.equal(r.coins,15);
assert.equal(streakFor(q.days,null,'2026-10-03'),3);assert.equal(streakFor(q.days,'task1','2026-10-03'),0);
r=completeQuest(q,g,'task1','2026-10-03');assert.equal(r.coins,20);assert.equal(r.tickets,1); // overall milestone cannot pay twice
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
console.log('PASS: daily duplicate protection, capped rewards, independent/OR streaks, milestone deduplication, archived tasks, leap dates, all 62 learning descriptions');
