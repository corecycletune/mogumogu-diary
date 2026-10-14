import assert from 'node:assert/strict';
import {freshGame} from '../progress-store.js';
import {completeQuest,emptyQuests} from '../quest-core.js';
import {grantMultiRewards,multiStatus,applyDraw} from '../multi-draw.js';
import {BY_ID} from '../game-catalog.js';
const days=n=>Object.fromEntries(Array.from({length:n},(_,i)=>[new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),['meal']]));
let g=freshGame('jun');
assert.equal(grantMultiRewards(g,days(9)),false);
assert.equal(grantMultiRewards(g,days(10)),true);
assert.equal(multiStatus(g,10),'available');assert.equal(multiStatus(g,100),'locked');
assert.equal(grantMultiRewards(g,days(10)),false);
const gap=days(10);delete gap['2026-01-05'];assert.equal(grantMultiRewards(freshGame('jun'),gap),false);
const cards=Array(10).fill(BY_ID.rice_n),at='2026-01-10T12:00:00Z';
const pull=applyDraw(g,cards,'multi10','2026-01-10',at);
assert.equal(pull.state.drawCount,10);assert.equal(pull.state.inventory.rice_n.copies,10);
assert.equal(pull.results.filter(r=>r.newCard).length,1);
assert.equal(pull.results.at(-1).copies,10);assert.equal(pull.state.coins,g.coins);
assert.equal(multiStatus(pull.state,10),'used');assert.equal(applyDraw(pull.state,cards,'multi10','2026-01-10',at),null);
assert.equal(grantMultiRewards(pull.state,days(110)),true);assert.equal(multiStatus(pull.state,10),'used');
const hundred=applyDraw(pull.state,Array(100).fill(BY_ID.rice_n),'multi100','2026-04-10',at);
assert.equal(hundred.state.drawCount,110);assert.equal(hundred.state.inventory.rice_n.copies,110);assert.equal(hundred.state.history.length,25);assert.equal(hundred.results.filter(r=>r.newCard).length,0);
assert.equal(applyDraw(hundred.state,Array(100).fill(BY_ID.rice_n),'multi100','2026-04-10',at),null);
assert.equal(applyDraw(g,cards,'multi100','2026-01-10',at),null);
let q=emptyQuests('jun');q.days=days(9);
const completed=completeQuest(q,freshGame('jun'),'meal','2026-01-10',at);assert.equal(multiStatus(completed.game,10),'available');
assert.equal(BY_ID.secret_rinpa_ur.rarity,'SSR');
console.log('PASS: 9/10/100-day thresholds, gaps, durable one-time rights, duplicate NEW in bulk, 100-card atomic inventory, retries and SSR downgrade');

// Login must never create a draw; existing tickets remain usable and spend once.
assert.equal(applyDraw(freshGame('jun'),[BY_ID.rice_n],'free','2026-10-13',at),null);
const withTicket=freshGame('jun');withTicket.tickets=1;withTicket.lastFreeDay='2026-10-12';
const ticketDraw=applyDraw(withTicket,[BY_ID.rice_n],'ticket','2026-10-13',at);
assert.equal(ticketDraw.state.tickets,0);assert.equal(ticketDraw.state.lastFreeDay,'2026-10-12');
assert.equal(applyDraw(ticketDraw.state,[BY_ID.rice_n],'ticket','2026-10-13',at),null);

// The daily quest reward neither consumes nor grants banked tickets/coins.
const dailyGame=freshGame('jun');dailyGame.coins=250;dailyGame.tickets=3;
const clearedDays={'2026-10-13':['meal','read']};
const dailyDraw=applyDraw(dailyGame,[BY_ID.rice_n],'free','2026-10-13',at,clearedDays);
assert.equal(dailyDraw.state.coins,250);assert.equal(dailyDraw.state.tickets,3);
assert.equal(dailyDraw.state.lastFreeDay,'2026-10-13');
assert.equal(applyDraw(dailyDraw.state,[BY_ID.rice_n],'free','2026-10-13',at,clearedDays),null);
assert.equal(applyDraw(dailyDraw.state,[BY_ID.rice_n],'free','2026-10-14',at,clearedDays),null);
assert.ok(applyDraw(dailyDraw.state,[BY_ID.rice_n],'free','2026-10-14',at,{'2026-10-14':['meal']}));
assert.equal(applyDraw(dailyGame,cards,'free','2026-10-13',at,clearedDays),null);
console.log('PASS: quest-required daily reward, one draw per day, no carryover, wallet preserved');
