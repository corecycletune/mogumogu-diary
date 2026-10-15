import {groupStorageKey,chatStorageKey} from './account-compat.js';
import {emptyQuests,completeQuest,cancelToday,setTaskStatus,deleteQuest,taskStatus,activeCount,localDay,streakFor,stampForDay,nextMilestone} from './quest-core.js';
import {mountQuestPages} from './quest-ui.js';
import {BY_ID} from './game-catalog.js';
import {playSound} from './sound.js';
import {jointProgress,joinedDay} from './social-core.js';
const profile=window.MogumoguAccount?.uid;
const mount=document.getElementById('questList');
if(mount){
  const el=id=>document.getElementById(id);
  let ctx=null,chatCtx=null,chatLibrary=null,chatWorking=false,quests=emptyQuests(profile),confirmed=false,working=false,unwatch=null,unmessages=null,connectionSeq=0,groups=[],lastPublished='';
  window.MogumoguStampForDay=stampForDay;
  function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
  function notice(value){el('questStatus').textContent=value;}

  const completionDialog=text('dialog','','quest-confirm');
  completionDialog.id='questConfirm';
  const title=text('h2','クエストを完了しますか？'),description=text('p','');
  const extraLabel=text('label','','label'),extraInput=text('input','','field');
  extraInput.maxLength=120;extraLabel.append(extraInput);
  const actions=text('div','','button-row');
  const cancel=text('button','キャンセル','btn secondary'),save=text('button','完了する','btn primary');
  cancel.type=save.type='button';actions.append(cancel,save);
  completionDialog.append(title,description,extraLabel,actions);document.body.append(completionDialog);
  let pending=null;
  cancel.addEventListener('click',()=>{pending=null;completionDialog.close();});
  completionDialog.addEventListener('cancel',()=>{pending=null;});
  save.addEventListener('click',()=>{
    if(!extraInput.checkValidity()){extraInput.reportValidity();return;}
    const p=pending;pending=null;completionDialog.close();
    if(!p||p.context!==ctx||p.sequence!==connectionSeq||p.day!==localDay())return notice('日付・接続が変わりました。もう一度お試しください。');
    if(taskStatus(quests.tasks[p.id])==='active')void finish(p.id,extraInput.value.trim());
  });
  function confirmCompletion(id,name){
    if(!ctx||!confirmed||working||completionDialog.open)return;
    pending={id,context:ctx,sequence:connectionSeq,day:localDay()};
    description.textContent='「'+name+'」を今日の達成として記録します。';
    const t=quests.tasks[id];extraLabel.hidden=!t?.fieldLabel;
    extraLabel.replaceChildren(document.createTextNode((t?.fieldLabel||'')+'（任意）'),extraInput);
    extraInput.type=t?.fieldType==='number'?'number':'text';extraInput.step='any';extraInput.required=false;extraInput.value='';
    completionDialog.showModal();cancel.focus();
  }
  async function mutate(kind,id,data){
    if(!ctx||!confirmed||working)return false;
    working=true;render();
    try{
      const result=await ctx.updateAdventure((current,game)=>{
        const q=structuredClone(current||emptyQuests(profile)),now=localDay();
        if(kind==='cancel')return game?cancelToday(q,game,id,now):null;
        if(kind==='delete'){const next=deleteQuest(q,id);return next?{quests:next}:null;}
        if(kind==='status'){const next=setTaskStatus(q,id,data,now);return next?{quests:next}:null;}
        if(kind==='save'){
          if(id&&!q.tasks[id])return null;
          if(!id&&activeCount(q)>=10)throw new Error('limit');
          const key=id||crypto.randomUUID(),old=q.tasks[key]||{};
          q.tasks[key]={...old,...data,status:old.status||'active',archived:old.archived||false,order:old.order??Object.keys(q.tasks).length};
        }else if(kind==='reorder'){data.forEach((key,index)=>{if(q.tasks[key])q.tasks[key].order=index;});}
        else if(kind==='value'){
          if(now!==localDay()||!(q.days[now]||[]).includes(id))return null;
          const key=now+':'+id,t=q.tasks[id];if(!t)return null;
          q.values=q.values||{};q.valueMeta=q.valueMeta||{};
          if(data){q.values[key]=data;q.valueMeta[key]={label:t.fieldLabel||'',type:t.fieldType||'text',unit:t.fieldUnit||''};}
          else{delete q.values[key];delete q.valueMeta[key];}
        }else return null;
        q.updatedAt=new Date().toISOString();return {quests:q};
      });
      if(result){quests=result.quests;return true;}return false;
    }catch(e){notice(e.message==='limit'?'挑戦中とお休み中は10件までです。':'保存できませんでした。通信を確認してください。');return false;}
    finally{working=false;render();}
  }
  const pages=mountQuestPages({state:()=>({quests}),mutate,confirmCompletion,notice});
  function render(){
    const day=localDay(),done=quests.days[day]||[];
    el('questStreak').textContent=streakFor(quests.days,null,day)+'日';
    el('headerStreak').textContent=confirmed?String(streakFor(quests.days,null,day)):'—';
    el('questDone').textContent=done.length+'件';
    const next=nextMilestone(quests.days,null,day);
    el('questNextReward').textContent=next&&next.remaining<=2?'あと'+next.remaining+'日で '+next.coins+'コイン！':'';
    el('questNextReward').hidden=!el('questNextReward').textContent;
    mount.replaceChildren();
    const list=[['meal',{name:'ごはんを1回記録する'}],...Object.entries(quests.tasks).filter(([,t])=>taskStatus(t)==='active').sort((a,b)=>(a[1].order||0)-(b[1].order||0))];
    const activeDone=list.filter(([id])=>done.includes(id)).length;
    if(el('homeQuestProgress')){el('homeQuestProgress').max=list.length;el('homeQuestProgress').value=activeDone;el('homeQuestProgress').textContent=activeDone+' / '+list.length;el('homeQuestCount').textContent=activeDone+' / '+list.length;el('homeStreak').textContent=streakFor(quests.days,null,day)+'日';}
    for(const [id,t] of list){
      const row=text('div','','quest-row quest-compact'),label=text('div','','quest-row-label');
      const name=text(id==='meal'?'strong':'button',t.name,id==='meal'?'':'quest-name-button');
      if(id!=='meal'){name.type='button';name.addEventListener('click',()=>pages.openDetail(id));}
      label.append(name,text('small','連続 '+streakFor(quests.days,id,day,quests)+'日'));
      const btn=text('button',done.includes(id)?'✓ できた':id==='meal'?'ごはんへ':'できた！','btn '+(done.includes(id)?'secondary':'primary'));
      btn.type='button';btn.disabled=working||(!confirmed&&id!=='meal')||done.includes(id);
      btn.addEventListener('click',()=>id==='meal'?document.querySelector('[data-target="timer"]').click():confirmCompletion(id,t.name));
      row.append(label,btn);mount.append(row);
    }
    const archived=el('questArchived');archived.replaceChildren();
    for(const [id,t] of Object.entries(quests.tasks).filter(([,v])=>taskStatus(v)==='paused')){
      const row=text('div','','quest-row quest-compact'),name=text('button',t.name,'quest-name-button'),resume=text('button','再開','btn secondary');
      name.type=resume.type='button';name.addEventListener('click',()=>pages.openDetail(id));
      resume.disabled=working||!confirmed;resume.addEventListener('click',()=>void mutate('status',id,'active'));
      row.append(name,resume);archived.append(row);
    }
    if(!archived.childElementCount)archived.append(text('p','お休み中のクエストはありません。','small'));
    el('questManage').disabled=working||!confirmed;
    pages.refresh();
    el('messageSend').disabled=!chatCtx||chatWorking;
    el('chatGroupSelect').disabled=!el('chatGroupSelect').options.length||chatWorking;
    el('chatCreate').disabled=chatWorking;el('chatJoin').disabled=chatWorking;
  }
  async function finish(id,value=''){
    if(!ctx||!confirmed||working)return;
    working=true;render();
    try{
      const result=await ctx.updateAdventure((q,g)=>g?completeQuest(q||emptyQuests(profile),g,id,localDay(),new Date().toISOString(),value):null);
      if(result){quests=result.quests;playSound('success');notice('できた！ '+(result.coins?'コイン ＋'+result.coins:''));window.dispatchEvent(new CustomEvent('mogumogu:quest',{detail:{days:quests.days,tasks:quests.tasks,deletedTasks:quests.deletedTasks||{},values:quests.values||{},valueMeta:quests.valueMeta||{}}}));}
    }catch{notice('達成を保存できませんでした。');}finally{working=false;render();}
  }
  async function recordMeal(){
    const bridge=window.MogumoguGameBridge;
    if(confirmed&&bridge?.getLocalMeals&&bridge.getLocalMeals().some(m=>m.date===localDay()&&m.mealType!=='snack')&&!(quests.days[localDay()]||[]).includes('meal'))await finish('meal');
  }
  function messages(items){
    const list=el('familyMessages');list.replaceChildren();
    for(const item of items){
      const mine=item.senderUid===profile;
      const row=text('article','',mine?'family-message own':'family-message');
      const at=item.createdAt?.toDate?.();
      row.append(text('small',(item.senderId||'過去のメッセージ')+(at?' · '+at.toLocaleString('ja-JP'):' · 送信中')),text('p',item.text));
      if(item.cardId&&BY_ID[item.cardId])row.append(text('strong',BY_ID[item.cardId].rarity+' · '+BY_ID[item.cardId].name));
      const group=chatCtx,liked=(item.likes||[]).includes(profile);
      const like=text('button','♥ '+(item.likes||[]).length,'message-like');like.type='button';like.setAttribute('aria-label','いいね '+(item.likes||[]).length+'件');like.setAttribute('aria-pressed',String(liked));like.disabled=liked||!group?.likeMessage;
      like.addEventListener('click',async()=>{
        like.disabled=true;
        try{await group.likeMessage(item.id);if(chatCtx===group)el('messageStatus').textContent='いいねしました。';}
        catch(e){like.disabled=false;if(chatCtx===group)el('messageStatus').textContent='いいねを保存できませんでした。もう一度お試しください。';}
      });row.append(like);list.append(row);
    }
    if(!items.length)list.append(text('p','グループに「できた！」を伝えてみよう。','small'));
  }
  async function send(value,cardId=''){
    if(!chatCtx||chatWorking)return;
    chatWorking=true;render();el('messageStatus').textContent='送信中…';
    try{await chatCtx.sendMessage(value,(ctx?.isAccount||chatCtx.familyId===ctx?.familyId)&&!ctx?.isLocal?cardId:'');el('messageText').value='';el('messageStatus').textContent='送信しました。';}
    catch(e){el('messageStatus').textContent='送信できませんでした。通信・グループ接続を確認してください。';}
    finally{chatWorking=false;render();}
  }
  el('messageForm').addEventListener('submit',e=>{e.preventDefault();const value=el('messageText').value.trim();if(value&&value.length<=500)void send(value);});
  window.addEventListener('mogumogu:share-card',e=>{const card=BY_ID[e.detail.id];if(card&&['SSR','UR'].includes(card.rarity))void send(card.name+'（'+card.rarity+'）をゲットしたよ！',card.id);});
  function groupList(){return groups;}
  function groupName(){return groups.find(g=>g.id===chatCtx?.familyId)?.name||'グループ';}
  function refreshGroups(){
    const select=el('chatGroupSelect'),selected=chatCtx?.familyId||select.value;select.replaceChildren();
    for(const group of groupList()){const option=text('option',group.alias||group.name);option.value=group.id;select.append(option);}
    if(selected&&groupList().some(g=>g.id===selected))select.value=selected;
    else {const remembered=localStorage.getItem(chatStorageKey(profile));if(remembered&&groupList().some(g=>g.id===remembered))select.value=remembered;}
    select.disabled=!select.options.length||chatWorking;
    el('chatInvite').textContent=chatCtx?.familyId||'';
    el('chatGroupDetails').hidden=!chatCtx;
    el('chatGroupTitle').textContent=chatCtx?groupName():'';
    el('chatAliasSave').disabled=!chatCtx||chatWorking;
    if(chatCtx)el('chatGroupAlias').value=groupList().find(g=>g.id===chatCtx.familyId)?.alias||'';
    el('chatInviteCopy').disabled=el('chatInviteMessageCopy').disabled=el('chatInviteCodeCopy').disabled=el('chatLeave').disabled=!chatCtx||chatWorking;
    el('chatRename').disabled=!chatCtx||chatWorking;
  }
  async function selectChat(context){
    unmessages?.();chatCtx=context;el('familyMessages').replaceChildren();
    localStorage.setItem(chatStorageKey(profile),context.familyId);
    unmessages=chatCtx.watchMessages(items=>{if(chatCtx.familyId===context.familyId)messages(items);},()=>{if(chatCtx.familyId===context.familyId)el('messageStatus').textContent='おしゃべりに接続できません。もう一度お試しください。';});
    el('messageStatus').textContent='';refreshGroups();render();
    const selected=context.familyId;
    try{
      const members=await chatLibrary.groupMembers(selected);if(chatCtx?.familyId!==selected)return;
      el('chatMemberCount').textContent=members.length;
      const roster=el('chatMembers');roster.replaceChildren();
      for(const member of members){
        const row=text('li',member.accountId||'既存メンバー（ID未登録）');
        if(member.uid!==profile){
          const add=text('button','フレンド申請','link-button');add.type='button';
          add.addEventListener('click',async()=>{
            add.disabled=true;
            try{await chatLibrary.sendFriendRequest(member.uid,selected);el('friendStatus').textContent='申請を送りました。';}
            catch{add.disabled=false;el('friendStatus').textContent='申請できませんでした。すでに申請済みか、相手が退出しています。';}
          });row.append(' ',add);
        }
        roster.append(row);
      }
      const activity=await chatLibrary.groupActivity(selected);if(chatCtx?.familyId!==selected)return;
      const map=Object.fromEntries(members.map(m=>[m.uid,new Set(activity.filter(a=>a.uid===m.uid).map(a=>a.day))]));
      let start=members.reduce((day,m)=>joinedDay(m.joinedAt)>day?joinedDay(m.joinedAt):day,'0000-00-00');
      const change=groups.find(g=>g.id===selected)?.membershipChangedAt;
      if(change)start=joinedDay({toDate:()=>new Date(change)})>start?joinedDay({toDate:()=>new Date(change)}):start;
      const progress=jointProgress(members.map(m=>m.uid),map,start);
      el('groupStreak').textContent=progress.days===null?'1人グループは共同連続記録の対象外です。':'グループ共同連続 '+progress.days+'日 · 今日：'+progress.today.map(s=>(members.find(m=>m.uid===s.uid)?.accountId||'メンバー')+(s.done?' ✓':' 未達成')).join(' / ');
    }catch{if(chatCtx?.familyId===selected)el('messageStatus').textContent='メンバー・共同記録を読み込めませんでした。';}
  }
  async function refreshFriends(){
    chatLibrary=chatLibrary||await import('./firebase-sync.js');
    try{
      const [requests,friends]=await Promise.all([chatLibrary.pendingFriendRequests(),chatLibrary.friendList()]);
      const target=el('friendRequests');target.replaceChildren();
      for(const request of requests){
        const row=text('div',request.senderId+' からフレンド申請','quest-row');
        for(const [label,action] of [['承認',()=>chatLibrary.acceptFriendRequest(request.senderUid)],['断る',()=>chatLibrary.rejectFriendRequest(request.senderUid)]]){
          const button=text('button',label,'btn secondary');button.type='button';
          button.addEventListener('click',async()=>{button.disabled=true;try{await action();await refreshFriends();}catch{button.disabled=false;el('friendStatus').textContent='操作を保存できませんでした。';}});row.append(button);
        }target.append(row);
      }
      const list=el('friendList');list.replaceChildren();
      for(const friend of friends){
        const row=text('div','','quest-row'),label=text('span',friend.accountId+' · 連続記録を読み込み中…');row.append(label);
        const remove=text('button','フレンド解除','link-button');remove.type='button';
        remove.addEventListener('click',async()=>{if(!confirm(friend.accountId+' とのフレンド関係を解除しますか？'))return;remove.disabled=true;try{await chatLibrary.removeFriend(friend.id);await refreshFriends();}catch{remove.disabled=false;el('friendStatus').textContent='解除できませんでした。';}});row.append(remove);list.append(row);
        try{
          const [mine,theirs]=await Promise.all([chatLibrary.friendActivity(profile),chatLibrary.friendActivity(friend.uid)]);
          const result=jointProgress([profile,friend.uid],{[profile]:mine,[friend.uid]:theirs},joinedDay(friend.acceptedAt));
          label.textContent=friend.accountId+' · 共同連続 '+result.days+'日 · 今日 '+(mine.has(localDay())?'自分✓':'自分未達成')+' / '+(theirs.has(localDay())?'相手✓':'相手未達成');
        }catch{label.textContent=friend.accountId+' · 連続記録を読み込めませんでした。';}
      }
      if(!friends.length&&!requests.length)el('friendStatus').textContent='グループのメンバーからフレンド申請できます。';
    }catch{el('friendStatus').textContent='フレンド一覧を読み込めませんでした。';}
  }
  function inviteCode(value){
    const raw=value.trim();
    if(/^[A-Za-z0-9_-]{24}$/.test(raw))return raw;
    try{const url=new URL(raw);if(url.origin===location.origin)return url.searchParams.get('invite')||'';}catch{}
    return '';
  }
  async function manageGroup(action){
    if(chatWorking)return;chatWorking=true;render();
    try{
      chatLibrary=chatLibrary||await import('./firebase-sync.js');
      const name=el('chatGroupName').value.trim(),code=el('chatGroupCode').value.trim();
      if(action==='create'&&!name){el('chatGroupName').focus();throw new Error('group-name');}
      const context=action==='create'?await chatLibrary.createChatGroup(name):await chatLibrary.joinChatGroup(action==='select'?el('chatGroupSelect').value:inviteCode(code));
      groups=await chatLibrary.restoreAccountGroups();
      if(confirmed&&quests.days[localDay()]?.length)try{await chatLibrary.publishActivity(quests,localDay());}catch{el('friendStatus').textContent='共同記録の同期は次回も再試行します。';}
      await selectChat(context);void refreshFriends();playSound('confirm');el('chatGroupCode').value='';el('chatGroupName').value='';
      history.replaceState(null,'',location.pathname+location.hash);
    }catch(e){el('messageStatus').textContent=e.message==='group-name'?'グループ名を入力してください。':e.message==='group-code'?'招待リンクかコードを確認してください。':'グループへの接続に失敗しました。通信状態と招待を確認してください。';}
    finally{chatWorking=false;refreshGroups();render();}
  }
  el('chatGroupSelect').addEventListener('change',()=>void manageGroup('select'));
  el('groupRefresh').addEventListener('click',()=>{if(chatCtx){void selectChat(chatCtx);void refreshFriends();}});
  el('chatCreate').addEventListener('click',()=>void manageGroup('create'));
  el('chatJoin').addEventListener('click',()=>void manageGroup('join'));
  function invitation(){return 'モグモグで一緒に習慣を続けよう！\nグループ「'+groupName()+'」に招待するよ。\n下のリンクから参加してね。\n'+new URL('?invite='+encodeURIComponent(chatCtx.familyId),location.href).href;}
  el('chatInviteCopy').addEventListener('click',async()=>{
    if(!chatCtx)return;
    const message=invitation();
    try{
      if(navigator.share)await navigator.share({title:'モグモグのグループに招待',text:message});
      else {await navigator.clipboard.writeText(message);el('messageStatus').textContent='招待メッセージをコピーしました。';}
    }catch(e){if(e.name!=='AbortError')el('messageStatus').textContent='共有できませんでした。招待コードをコピーして送ってください。';}
  });
  el('chatInviteMessageCopy').addEventListener('click',async()=>{if(!chatCtx)return;try{await navigator.clipboard.writeText(invitation());el('messageStatus').textContent='招待文をコピーしました。';}catch{el('messageStatus').textContent='招待文をコピーできませんでした。';}});
  el('chatInviteCodeCopy').addEventListener('click',async()=>{if(!chatCtx)return;try{await navigator.clipboard.writeText(chatCtx.familyId);el('messageStatus').textContent='招待コードをコピーしました。';}catch{el('messageStatus').textContent='招待コードを選んでコピーしてください。';}});
  el('chatLeave').addEventListener('click',async()=>{
    if(!chatCtx||chatWorking||!confirm('グループ「'+groupName()+'」を退出しますか？ 個人の記録やカードは残ります。'))return;
    chatWorking=true;render();
    try{
      await chatLibrary.leaveGroup(chatCtx.familyId);unmessages?.();unmessages=null;chatCtx=null;
      groups=await chatLibrary.restoreAccountGroups();
      localStorage.removeItem(chatStorageKey(profile));el('familyMessages').replaceChildren();el('chatMembers').replaceChildren();
      el('messageStatus').textContent='退出しました。個人の記録はそのままです。';
      if(groups.length){chatWorking=false;refreshGroups();await manageGroup('select');}
    }catch{el('messageStatus').textContent='退出を保存できませんでした。もう一度お試しください。';}
    finally{chatWorking=false;refreshGroups();render();}
  });
  el('chatRename').addEventListener('click',async()=>{if(!chatCtx||chatWorking)return;const name=el('chatGroupName').value.trim();if(!name){el('chatGroupName').focus();return;}try{await chatLibrary.renameGroup(chatCtx.familyId,name);groups=await chatLibrary.restoreAccountGroups();refreshGroups();el('chatGroupName').value='';el('messageStatus').textContent='全員共通の名前を変更しました。';}catch(e){el('messageStatus').textContent='名前を変更できませんでした。作成者か、作成者の退出後のメンバーが変更できます。';}});
  el('chatAliasSave').addEventListener('click',async()=>{if(!chatCtx||chatWorking)return;try{await chatLibrary.setGroupAlias(chatCtx.familyId,el('chatGroupAlias').value);groups=await chatLibrary.restoreAccountGroups();refreshGroups();el('messageStatus').textContent='自分だけの呼び名を保存しました。';}catch{el('messageStatus').textContent='呼び名を保存できませんでした。';}});
  async function connect(context){
    const seq=++connectionSeq;
    confirmed=false;working=true;render();
    if(seq!==connectionSeq)return;
    unwatch?.();ctx=context;working=false;confirmed=false;quests=emptyQuests(profile);render();
    notice('');
    unwatch=ctx.watchQuests((value,meta)=>{
      if(seq!==connectionSeq)return;
      quests=value||emptyQuests(profile);confirmed=!meta.fromCache&&!meta.hasPendingWrites;render();
      notice(confirmed?'今日も、自分のペースでひとつずつ。':'準備しています…');void recordMeal();
      window.dispatchEvent(new CustomEvent('mogumogu:quest',{detail:{days:quests.days,tasks:quests.tasks,deletedTasks:quests.deletedTasks||{},values:quests.values||{},valueMeta:quests.valueMeta||{}}}));
      const day=localDay(),signature=day+':'+(quests.days[day]||[]).join(',');
      if(confirmed&&quests.days[day]?.length&&lastPublished!==signature){lastPublished=signature;void import('./firebase-sync.js').then(api=>api.publishActivity(quests,day)).then(()=>{if(chatCtx)void selectChat(chatCtx);void refreshFriends();}).catch(()=>{lastPublished='';});}
    },()=>{if(seq!==connectionSeq)return;confirmed=false;notice('習慣を読み込めませんでした。もう一度お試しください。');render();});

  }
  window.addEventListener('mogumogu:connected',e=>void connect(e.detail.context));
  window.addEventListener('mogumogu:game-ready',()=>void recordMeal());
  window.addEventListener('mogumogu:meals',()=>void recordMeal());
  if(window.MogumoguGameBridge?.getContext())void connect(window.MogumoguGameBridge.getContext());

  try{groups=JSON.parse(localStorage.getItem(groupStorageKey(profile))||'[]');}catch{groups=[];}
  refreshGroups();
  const invited=new URLSearchParams(location.search).get('invite');
  if(invited){el('chatGroupCode').value=invited;document.querySelector('[data-target="family"]')?.click();el('messageStatus').textContent='招待されたグループです。「参加する」を押してください。';}
  else if(groupList().length)void manageGroup('select');
  else void refreshFriends();render();
}
