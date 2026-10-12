import {emptyQuests,completeQuest,localDay,streakFor} from './quest-core.js';
import {BY_ID} from './game-catalog.js';
const profile=document.body.dataset.profile;
const mount=document.getElementById('questList');
if(mount){
  const el=id=>document.getElementById(id);
  let ctx=null,quests=emptyQuests(profile),confirmed=false,working=false,unwatch=null,unmessages=null;
  const names={jun:'じゅんちゃん',ichika:'いちかちゃん',sato:'ばぁば'};
  function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
  function notice(value){el('questStatus').textContent=value;}
  function render(){
    const day=localDay(),done=quests.days[day]||[];
    el('questStreak').textContent=streakFor(quests.days,null,day)+'日';
    el('questDone').textContent=done.length+'件';
    mount.replaceChildren();
    const list=[['meal',{name:'ごはんを記録する'}],...Object.entries(quests.tasks).filter(([,v])=>!v.archived)];
    for(const [id,task] of list){
      const row=text('div','', 'quest-row');
      const label=text('div','');label.append(text('strong',task.name),text('small','個別の連続記録 '+streakFor(quests.days,id,day)+'日'));
      const button=text('button',done.includes(id)?'✓ できた':id==='meal'?'ごはんへ':'できた！','btn '+(done.includes(id)?'secondary':'primary'));
      button.type='button';button.disabled=working||(!confirmed&&id!=='meal')||done.includes(id);
      button.addEventListener('click',()=>id==='meal'?document.querySelector('[data-target="timer"]').click():void finish(id));
      row.append(label,button);
      if(id!=='meal'){
        const archive=text('button','お休みにする','link-button');archive.type='button';archive.disabled=!confirmed||working;
        archive.addEventListener('click',()=>void changeTask(id));row.append(archive);
      }
      mount.append(row);
    }
    const archived=el('questArchived');archived.replaceChildren();
    for(const [id,task] of Object.entries(quests.tasks).filter(([,v])=>v.archived)){
      const row=text('div','', 'quest-row');row.append(text('span',task.name));
      const restart=text('button','再開する','btn secondary');restart.type='button';restart.disabled=working||!confirmed||list.length>=11;
      restart.addEventListener('click',()=>void changeTask(id,null,true));row.append(restart);archived.append(row);
    }
    el('questAdd').disabled=working||!confirmed||list.length>=11||Object.keys(quests.tasks).length>=50;
    el('messageSend').disabled=!ctx;
  }
  async function finish(id){
    if(!ctx||!confirmed||working)return;
    working=true;render();
    try{
      const day=localDay();
      const result=await ctx.updateAdventure((q,g)=>g?completeQuest(q||emptyQuests(profile),g,id,day):null);
      if(result){quests=result.quests;notice('できた！ '+(result.tickets?'ガチャ券 ＋1枚 ':'')+(result.coins?'コイン ＋'+result.coins:''));window.dispatchEvent(new CustomEvent('mogumogu:quest',{detail:{days:quests.days}}));}
      else notice('この習慣は今日すでに達成済みです。');
    }catch(error){notice('達成を保存できませんでした。通信を確認してもう一度お試しください。');}
    finally{working=false;render();}
  }
  async function changeTask(id,name,restart=false){
    if(!ctx||!confirmed||working)return;
    working=true;render();
    try{
      await ctx.updateAdventure((current)=>{
        const q=structuredClone(current||emptyQuests(profile));
        if(id){if(!q.tasks[id])return null;if(restart&&Object.values(q.tasks).filter(t=>!t.archived).length>=10)throw new Error('limit');q.tasks[id].archived=!restart;}
        else{
          if(Object.values(q.tasks).filter(t=>!t.archived).length>=10)throw new Error('limit');
          if(Object.keys(q.tasks).length>=50)throw new Error('history-limit');
          q.tasks[crypto.randomUUID()]={name,archived:false};
        }
        q.updatedAt=new Date().toISOString();return {quests:q};
      });
      el('questName').value='';notice(id?(restart?'再開しました。':'お休みにしました。これまでの記録は残ります。'):'習慣を登録しました。');
    }catch(e){notice(e.message==='limit'?'登録は10件までです。':e.message==='history-limit'?'お休み中の習慣から再開できます。':'習慣を保存できませんでした。');}
    finally{working=false;render();}
  }
  el('questForm').addEventListener('submit',e=>{e.preventDefault();const name=el('questName').value.trim();if(name&&name.length<=60)void changeTask(null,name);});
  async function recordMeal(){
    const bridge=window.MogumoguGameBridge;
    if(confirmed&&bridge?.confirmedMeals()&&bridge.getCloudMeals().some(m=>m.date===localDay()&&m.mealType!=='snack')&&!(quests.days[localDay()]||[]).includes('meal'))await finish('meal');
  }
  function messages(items){
    const list=el('familyMessages');list.replaceChildren();
    for(const item of items){
      const row=text('article','',item.sender===profile?'family-message own':'family-message');
      const at=item.createdAt?.toDate?.();
      row.append(text('small',(names[item.sender]||'家族')+(at?' · '+at.toLocaleString('ja-JP'):' · 送信中')),text('p',item.text));
      if(item.cardId&&BY_ID[item.cardId])row.append(text('strong',BY_ID[item.cardId].rarity+' · '+BY_ID[item.cardId].name));
      list.append(row);
    }
    if(!items.length)list.append(text('p','家族に「できた！」を伝えてみよう。','small'));
  }
  async function send(value,cardId=''){
    if(!ctx)return;
    el('messageSend').disabled=true;el('messageStatus').textContent='送信中…通信が戻ると送信されます。';
    try{await ctx.sendMessage(value,cardId);el('messageText').value='';el('messageStatus').textContent='送信しました。';}
    catch(e){el('messageStatus').textContent='送信できませんでした。通信・家族接続を確認してください。';}
    finally{el('messageSend').disabled=!ctx;}
  }
  el('messageForm').addEventListener('submit',e=>{e.preventDefault();const value=el('messageText').value.trim();if(value&&value.length<=500)void send(value);});
  window.addEventListener('mogumogu:share-card',e=>{const card=BY_ID[e.detail.id];if(card)void send(card.name+'（'+card.rarity+'）をゲットしたよ！',card.id);});
  async function connect(context){
    unwatch?.();unmessages?.();ctx=context;confirmed=false;quests=emptyQuests(profile);render();
    notice('家族と習慣を同期中…');
    unwatch=ctx.watchQuests((value,meta)=>{
      quests=value||emptyQuests(profile);confirmed=!meta.fromCache&&!meta.hasPendingWrites;render();
      notice(confirmed?'今日も、自分のペースでひとつずつ。':'同期を確認中…');void recordMeal();
      window.dispatchEvent(new CustomEvent('mogumogu:quest',{detail:{days:quests.days}}));
    },()=>{confirmed=false;notice('習慣の同期に接続できません。家族接続を確認してください。');render();});
    unmessages=ctx.watchMessages(messages,()=>{el('messageStatus').textContent='メッセージを読み込めません。家族接続を確認してください。';});
    el('messageStatus').textContent='同じ家族グループの人だけに届きます。';
  }
  window.addEventListener('mogumogu:connected',e=>void connect(e.detail.context));
  window.addEventListener('mogumogu:game-ready',()=>void recordMeal());
  window.addEventListener('mogumogu:meals',()=>void recordMeal());
  if(window.MogumoguGameBridge?.getContext())void connect(window.MogumoguGameBridge.getContext());
  render();
}
