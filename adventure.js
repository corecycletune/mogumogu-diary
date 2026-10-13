import {localContext,prepareCloudContext} from './progress-store.js';
import {emptyQuests,completeQuest,localDay,streakFor,stampForDay,nextMilestone} from './quest-core.js';
import {BY_ID} from './game-catalog.js';
const profile=document.body.dataset.profile;
const mount=document.getElementById('questList');
if(mount){
  const el=id=>document.getElementById(id);
  let ctx=null,chatCtx=null,chatLibrary=null,chatWorking=false,quests=emptyQuests(profile),confirmed=false,working=false,unwatch=null,unmessages=null,connectionSeq=0;
  window.MogumoguStampForDay=stampForDay;
  const names={jun:'じゅんちゃん',ichika:'いちかちゃん',sato:'ばぁば'};
  function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
  function notice(value){el('questStatus').textContent=value;}
  const completionDialog=text('dialog','','quest-confirm');
  completionDialog.id='questConfirm';
  completionDialog.setAttribute('aria-labelledby','questConfirmTitle');
  completionDialog.setAttribute('aria-describedby','questConfirmText');
  const confirmationTitle=text('h2','クエストを完了しますか？');confirmationTitle.id='questConfirmTitle';
  const confirmationText=text('p','');confirmationText.id='questConfirmText';
  const confirmationActions=text('div','','button-row');
  const cancelCompletion=text('button','キャンセル','btn secondary');cancelCompletion.type='button';cancelCompletion.autofocus=true;
  const saveCompletion=text('button','完了する','btn primary');saveCompletion.type='button';
  confirmationActions.append(cancelCompletion,saveCompletion);
  completionDialog.append(confirmationTitle,confirmationText,confirmationActions);document.body.append(completionDialog);
  let pendingCompletion=null;
  cancelCompletion.addEventListener('click',()=>{pendingCompletion=null;completionDialog.close();});
  completionDialog.addEventListener('cancel',()=>{pendingCompletion=null;});
  saveCompletion.addEventListener('click',()=>{
    if(!completionDialog.open)return;
    const pending=pendingCompletion;pendingCompletion=null;completionDialog.close();
    if(!pending)return;
    if(pending.context!==ctx||pending.sequence!==connectionSeq||pending.day!==localDay()){
      notice('記録する日や接続が変わりました。もう一度「できた！」を押してください。');return;
    }
    if(!quests.tasks[pending.id]||quests.tasks[pending.id].archived)return;
    void finish(pending.id);
  });
  function confirmCompletion(id,name){
    if(!ctx||!confirmed||working||completionDialog.open)return;
    pendingCompletion={id,context:ctx,sequence:connectionSeq,day:localDay()};
    confirmationText.textContent='「'+name+'」を今日の達成として記録します。';
    completionDialog.returnValue='';completionDialog.showModal();cancelCompletion.focus();
  }
  function render(){
    const day=localDay(),done=quests.days[day]||[];
    el('questStreak').textContent=streakFor(quests.days,null,day)+'日';
    el('questDone').textContent=done.length+'件';
    const next=nextMilestone(quests.days,null,day);el('questNextReward').textContent=next&&next.remaining<=2?'あと'+next.remaining+'日で '+next.coins+'コイン！':'';el('questNextReward').hidden=!el('questNextReward').textContent;
    mount.replaceChildren();
    const list=[['meal',{name:'ごはんを1回記録する'}],...Object.entries(quests.tasks).filter(([,v])=>!v.archived)];
    const activeDone=list.filter(([id])=>done.includes(id)).length;
    if(el('homeQuestProgress')){el('homeQuestProgress').max=list.length;el('homeQuestProgress').value=activeDone;el('homeQuestProgress').textContent=activeDone+' / '+list.length;el('homeQuestCount').textContent=activeDone+' / '+list.length;el('homeStreak').textContent=streakFor(quests.days,null,day)+'日';}
    for(const [id,task] of list){
      const row=text('div','', 'quest-row');
      const label=text('div','');label.append(text('strong',task.name),text('small','個別の連続記録 '+streakFor(quests.days,id,day)+'日'));
      const nextTask=nextMilestone(quests.days,id,day);if(nextTask&&nextTask.remaining<=2)label.append(text('small','あと'+nextTask.remaining+'日で '+nextTask.coins+'コイン！','milestone-hint'));
      const button=text('button',done.includes(id)?'✓ できた':id==='meal'?'ごはんへ':'できた！','btn '+(done.includes(id)?'secondary':'primary'));
      button.type='button';button.disabled=working||(!confirmed&&id!=='meal')||done.includes(id);
      button.addEventListener('click',()=>id==='meal'?document.querySelector('[data-target="timer"]').click():confirmCompletion(id,task.name));
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
    el('messageSend').disabled=!chatCtx||chatWorking;
    el('chatGroupSelect').disabled=!el('chatGroupSelect').options.length||chatWorking;
    el('chatCreate').disabled=chatWorking;el('chatJoin').disabled=chatWorking;
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
    if(confirmed&&bridge?.getLocalMeals&&bridge.getLocalMeals().some(m=>m.date===localDay()&&m.mealType!=='snack')&&!(quests.days[localDay()]||[]).includes('meal'))await finish('meal');
  }
  function messages(items){
    const list=el('familyMessages');list.replaceChildren();
    for(const item of items){
      const row=text('article','',item.sender===profile?'family-message own':'family-message');
      const at=item.createdAt?.toDate?.();
      row.append(text('small',(names[item.sender]||'家族')+(at?' · '+at.toLocaleString('ja-JP'):' · 送信中')),text('p',item.text));
      if(item.cardId&&BY_ID[item.cardId])row.append(text('strong',BY_ID[item.cardId].rarity+' · '+BY_ID[item.cardId].name));
      const group=chatCtx,liked=(item.likes||[]).includes(profile);
      const like=text('button','♥ '+(item.likes||[]).length,'message-like');like.type='button';like.setAttribute('aria-label','いいね '+(item.likes||[]).length+'件');like.setAttribute('aria-pressed',String(liked));like.disabled=liked||!group?.likeMessage;
      like.addEventListener('click',async()=>{
        like.disabled=true;
        try{await group.likeMessage(item.id);if(chatCtx===group)el('messageStatus').textContent='いいねしました。';}
        catch(e){like.disabled=false;if(chatCtx===group)el('messageStatus').textContent='いいねを保存できませんでした。もう一度お試しください。';}
      });row.append(like);list.append(row);
    }
    if(!items.length)list.append(text('p','家族に「できた！」を伝えてみよう。','small'));
  }
  async function send(value,cardId=''){
    if(!chatCtx||chatWorking)return;
    chatWorking=true;render();el('messageStatus').textContent='送信中…';
    try{await chatCtx.sendMessage(value,chatCtx.familyId===ctx?.familyId&&!ctx?.isLocal?cardId:'');el('messageText').value='';el('messageStatus').textContent='送信しました。';}
    catch(e){el('messageStatus').textContent='送信できませんでした。通信・家族接続を確認してください。';}
    finally{chatWorking=false;render();}
  }
  el('messageForm').addEventListener('submit',e=>{e.preventDefault();const value=el('messageText').value.trim();if(value&&value.length<=500)void send(value);});
  window.addEventListener('mogumogu:share-card',e=>{const card=BY_ID[e.detail.id];if(card&&['SSR','UR'].includes(card.rarity))void send(card.name+'（'+card.rarity+'）をゲットしたよ！',card.id);});
  function groupList(){try{const value=JSON.parse(localStorage.getItem('mogumogu:groups:'+profile)||'[]');return Array.isArray(value)?value.filter(g=>typeof g.name==='string'&&/^[A-Za-z0-9_-]{24}$/.test(g.id)):[];}catch(e){return [];}}
  function refreshGroups(){
    const select=el('chatGroupSelect');select.replaceChildren();
    for(const group of groupList()){const option=text('option',group.name);option.value=group.id;select.append(option);}
    if(chatCtx)select.value=chatCtx.familyId;
    else {const remembered=localStorage.getItem('mogumogu:chat-current:'+profile);if(remembered&&groupList().some(g=>g.id===remembered))select.value=remembered;}
    select.disabled=!select.options.length||chatWorking;
    el('chatInvite').textContent=chatCtx?.familyId||'';el('chatInviteCopy').disabled=!chatCtx;el('chatRename').disabled=!chatCtx;
  }
  async function selectChat(context){
    unmessages?.();chatCtx=context;el('familyMessages').replaceChildren();
    localStorage.setItem('mogumogu:chat-current:'+profile,context.familyId);
    unmessages=chatCtx.watchMessages(items=>{if(chatCtx.familyId===context.familyId)messages(items);},()=>{if(chatCtx.familyId===context.familyId)el('messageStatus').textContent='おしゃべりに接続できません。もう一度お試しください。';});
    el('messageStatus').textContent='';refreshGroups();render();
  }
  async function manageGroup(action){
    if(chatWorking)return;chatWorking=true;render();
    try{
      chatLibrary=chatLibrary||await import('./firebase-sync.js');
      const name=el('chatGroupName').value.trim(),code=el('chatGroupCode').value.trim();
      const context=action==='create'?await chatLibrary.createChatGroup(profile,name):await chatLibrary.joinChatGroup(profile,action==='select'?el('chatGroupSelect').value:code,action==='select'?undefined:name);
      await selectChat(context);el('chatGroupCode').value='';el('chatGroupName').value='';
    }catch(e){el('messageStatus').textContent='グループに参加できませんでした。招待コードを確認してください。';}
    finally{chatWorking=false;refreshGroups();render();}
  }
  el('chatGroupSelect').addEventListener('change',()=>void manageGroup('select'));
  el('chatCreate').addEventListener('click',()=>void manageGroup('create'));
  el('chatJoin').addEventListener('click',()=>void manageGroup('join'));
  el('chatInviteCopy').addEventListener('click',async()=>{if(!chatCtx)return;try{await navigator.clipboard.writeText(chatCtx.familyId);el('messageStatus').textContent='招待コードをコピーしました。';}catch(e){el('messageStatus').textContent='招待コードを選んでコピーしてください。';}});
  el('chatRename').addEventListener('click',async()=>{if(!chatCtx||chatWorking)return;const name=el('chatGroupName').value.trim();if(!name){el('chatGroupName').focus();return;}try{chatLibrary=chatLibrary||await import('./firebase-sync.js');chatLibrary.renameGroup(profile,chatCtx.familyId,name);refreshGroups();el('messageStatus').textContent='グループの名前を変更しました。';}catch(e){el('messageStatus').textContent='名前を変更できませんでした。もう一度お試しください。';}});
  async function connect(context){
    const seq=++connectionSeq;
    confirmed=false;working=true;render();
    try{context=await prepareCloudContext(context);}catch(e){if(seq!==connectionSeq)return;notice('家族の記録を読み込めませんでした。');void connect(localContext(profile));return;}
    if(seq!==connectionSeq)return;
    unwatch?.();ctx=context;working=false;confirmed=false;quests=emptyQuests(profile);render();
    notice('');
    unwatch=ctx.watchQuests((value,meta)=>{
      if(seq!==connectionSeq)return;
      quests=value||emptyQuests(profile);confirmed=!meta.fromCache&&!meta.hasPendingWrites;render();
      notice(confirmed?'今日も、自分のペースでひとつずつ。':'準備しています…');void recordMeal();
      window.dispatchEvent(new CustomEvent('mogumogu:quest',{detail:{days:quests.days}}));
    },()=>{if(seq!==connectionSeq)return;confirmed=false;notice('習慣を読み込めませんでした。もう一度お試しください。');render();});
    if(!ctx.isLocal){if(!chatCtx&&!chatWorking)await selectChat(ctx);refreshGroups();}

  }
  window.addEventListener('mogumogu:connected',e=>void connect(e.detail.context));
  window.addEventListener('mogumogu:game-ready',()=>void recordMeal());
  window.addEventListener('mogumogu:meals',()=>void recordMeal());
  if(window.MogumoguGameBridge?.getContext())void connect(window.MogumoguGameBridge.getContext());
  else void connect(localContext(profile));
  refreshGroups();if(groupList().length)void manageGroup('select');render();
}
