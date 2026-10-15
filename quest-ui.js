import {taskStatus,activeCount,totalDone,bestStreak,streakFor,nextMilestone,localDay,dayBefore,isPausedDay} from './quest-core.js';
// Dedicated full-screen quest pages. All writes are delegated to the account transaction.
export function mountQuestPages({state,mutate,confirmCompletion,notice}){
  const node=(tag,value='',className='')=>{const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;};
  const button=(label,click,cls='secondary')=>{const b=node('button',label,'btn '+cls);b.type='button';b.addEventListener('click',click);return b;};
  const field=(form,label,value='',type='text',limit=60)=>{
    const wrap=node('label',label,'quest-form-field'),input=node('input','','field');
    input.type=type;input.value=value;input.maxLength=limit;wrap.append(input);form.append(wrap);return input;
  };
  const page=title=>{
    const dialog=node('dialog','','quest-screen'),head=node('header','','quest-screen-head'),body=node('div','','quest-screen-content');
    const heading=node('h2',title);head.append(button('← 戻る',()=>dialog.close()),heading);dialog.append(head,body);document.body.append(dialog);
    return {dialog,heading,body};
  };
  const manage=page('クエスト管理'),detail=page('クエスト詳細');
  let selected='',fromManager=false,scrollY=0;
  document.getElementById('questManage').addEventListener('click',()=>openManage());
  detail.dialog.addEventListener('close',()=>{if(fromManager){fromManager=false;openManage();}else window.scrollTo(0,scrollY);});
  function openManage(){if(detail.dialog.open)detail.dialog.close();renderManage();manage.dialog.showModal();}
  function openDetail(id,origin=false){
    if(!state().quests.tasks[id])return;
    selected=id;fromManager=origin;if(manage.dialog.open)manage.dialog.close();else scrollY=window.scrollY;
    renderDetail();detail.dialog.showModal();
  }
  function refresh(){if(manage.dialog.open)renderManage();if(detail.dialog.open)renderDetail();}
  function makeEditor(target,id){
    const t=id?state().quests.tasks[id]:{},form=node('form','','quest-editor');
    form.append(node('h3',id?'クエストを編集':'＋ 新しいクエスト'));
    const name=field(form,'クエスト名',t.name||'');name.required=true;
    const toggle=field(form,'追加入力を使う','','checkbox');toggle.checked=!!t.fieldLabel;
    const extras=node('div','','quest-extra-fields');extras.hidden=!toggle.checked;
    const label=field(extras,'入力欄の名前',t.fieldLabel||'','text',40);
    const typeLabel=node('label','入力の種類','quest-form-field'),type=node('select','','field');
    for(const [v,caption] of [['text','テキスト'],['number','数値（小数可）']]){const option=node('option',caption);option.value=v;type.append(option);}
    type.value=t.fieldType||'text';typeLabel.append(type);extras.append(typeLabel);
    const unit=field(extras,'単位（自由入力・任意）',t.fieldUnit||'','text',20);
    toggle.addEventListener('change',()=>{extras.hidden=!toggle.checked;label.required=toggle.checked;});
    form.append(extras);
    const submit=node('button',id?'変更を保存':'登録 ＋','btn primary');submit.type='submit';form.append(submit);
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(!form.reportValidity())return;
      const data={name:name.value.trim(),fieldLabel:toggle.checked?label.value.trim():'',fieldType:toggle.checked?type.value:'text',fieldUnit:toggle.checked?unit.value.trim():''};
      if(!data.name)return;
      if(await mutate('save',id,data)){refresh();notice(id?'変更しました。':'登録しました。');}
    });
    target.append(form);
  }
  function renderManage(){
    const q=state().quests,body=manage.body;body.replaceChildren();
    body.append(node('p','挑戦中＋お休み中 '+activeCount(q)+' / 10件（卒業済みは枠外）','small'));
    for(const [status,title] of [['active','🌱 挑戦中'],['paused','🌙 お休み中'],['graduated','🎓 卒業済み']]){
      const section=node('section','','quest-manage-section');section.append(node('h3',title));
      const entries=Object.entries(q.tasks).filter(([,t])=>taskStatus(t)===status).sort((a,b)=>(a[1].order||0)-(b[1].order||0));
      if(!entries.length)section.append(node('p','まだありません。','small'));
      for(const [id,t] of entries){
        const row=node('div','','quest-manage-row'),name=button(t.name+' ›',()=>openDetail(id,true));name.className='quest-name-button';row.append(name);
        if(status!=='active'){const resume=button('再開',()=>void change(id,'active'));resume.disabled=status==='graduated'&&activeCount(q)>=10;row.append(resume);}
        if(status==='active')for(const [label,delta] of [['↑',-1],['↓',1]]){const b=button(label,()=>void move(id,delta));b.setAttribute('aria-label',t.name+'を'+(delta<0?'上':'下')+'へ');row.append(b);}
        section.append(row);
      }
      body.append(section);
    }
    if(activeCount(q)<10)makeEditor(body,null);
    else body.append(node('p','上限10件です。卒業・削除すると新規登録できます。','small'));
  }

  async function change(id,status){
    const t=state().quests.tasks[id];if(!t)return;
    if(status==='graduated'&&!confirm('「'+t.name+'」を卒業しますか？ 記録と最高記録は残ります。'))return;
    if(await mutate('status',id,status)){
      refresh();notice(status==='graduated'?'🎓 卒業しました！ これまでの積み重ねに拍手。':status==='paused'?'お休みにしました。':'再開しました。');
      if(status==='graduated'&&detail.dialog.open){
        const banner=node('div','🎓 卒業おめでとう！','quest-graduation');detail.body.prepend(banner);
        setTimeout(()=>banner.remove(),2000);
      }
    }
  }
  async function move(id,direction){
    const q=state().quests,ids=Object.entries(q.tasks).filter(([,t])=>taskStatus(t)==='active').sort((a,b)=>(a[1].order||0)-(b[1].order||0)).map(([key])=>key);
    const i=ids.indexOf(id),j=i+direction;if(i<0||j<0||j>=ids.length)return;
    [ids[i],ids[j]]=[ids[j],ids[i]];
    if(await mutate('reorder',id,ids))refresh();
  }
  async function remove(id){
    const t=state().quests.tasks[id];if(!t)return;
    if(!confirm('「'+t.name+'」と達成履歴を削除しますか？ 元に戻せません。獲得済み報酬は残ります。'))return;
    if(!confirm('最終確認：本当に完全削除しますか？'))return;
    if(await mutate('delete',id)){
      fromManager=false;detail.dialog.close();refresh();notice('クエストと達成履歴を削除しました。');
    }
  }
  async function cancel(id){
    if(!confirm('今日の達成を取り消しますか？ 今回獲得した報酬も精算されます。'))return;
    if(await mutate('cancel',id)){refresh();notice('今日の達成を取り消しました。');}
  }
  async function editToday(id){
    const {quests:q}=state(),t=q.tasks[id],day=localDay(),key=day+':'+id;
    const input=prompt('今日の'+t.fieldLabel+'（空欄で値を削除）',q.values?.[key]||'');
    if(input===null)return;const value=input.trim();
    if(value.length>120||t.fieldType==='number'&&value!==''&&!Number.isFinite(Number(value))){notice('入力値を確認してください。');return;}
    if(await mutate('value',id,value)){refresh();notice('今日の入力を変更しました。');}
  }
  function renderDetail(){
    const q=state().quests,id=selected,t=q.tasks[id],body=detail.body;
    body.replaceChildren();if(!t)return;
    const status=taskStatus(t),day=localDay(),done=(q.days[day]||[]).includes(id);
    detail.heading.textContent=t.name;
    body.append(node('p',({active:'🌱 挑戦中',paused:'🌙 お休み中',graduated:'🎓 卒業済み'})[status],'small'));
    const metrics=node('div','','quest-detail-metrics');
    for(const [label,value] of [['連続',streakFor(q.days,id,day,q)+'日'],['累計',totalDone(q,id)+'回'],['最高',bestStreak(q,id)+'日']]){
      const tile=node('div','','metric');tile.append(node('strong',value),node('span',label));metrics.append(tile);
    }
    body.append(metrics);
    const next=nextMilestone(q.days,id,day,q);
    if(next&&status==='active')body.append(node('p','次の報酬：あと'+next.remaining+'日で '+next.coins+'コイン','small'));
    const controls=node('div','','button-row');
    if(status==='active'){
      if(done){controls.append(button('今日の達成を取り消す',()=>void cancel(id)));if(t.fieldLabel)controls.append(button('今日の入力を編集',()=>void editToday(id)));}
      else controls.append(button('今日できた！',()=>confirmCompletion(id,t.name),'primary'));
    }
    if(controls.childElementCount)body.append(controls);
    const edit=node('details','','quest-edit-details');edit.append(node('summary','名前・入力欄を編集'));
    makeEditor(edit,id);body.append(edit);
    const actions=node('div','','quest-detail-actions');
    if(status==='active')actions.append(button('お休みにする',()=>void change(id,'paused')));
    if(status!=='graduated')actions.append(button('卒業する',()=>void change(id,'graduated')));
    if(status!=='active')actions.append(button('再開する',()=>void change(id,'active')));
    actions.append(button('削除する',()=>void remove(id)));body.append(actions);
    body.append(node('h3','達成履歴'));
    const history=node('ul','','quest-history'),dates=new Set(Object.keys(q.days).filter(d=>(q.days[d]||[]).includes(id)));
    for(const d of Object.keys(t.pauseDays||{}))dates.add(d);
    const end=t.graduatedAt||day,earliest=t.createdDay||[...dates].sort()[0];
    if(earliest){let cursor=end;for(let i=0;i<60&&cursor>=earliest;i++,cursor=dayBefore(cursor))dates.add(cursor);}
    const sorted=[...dates].sort().reverse();
    for(const d of sorted){
      const key=d+':'+id,v=q.values?.[key],meta=q.valueMeta?.[key];
      const li=node('li',d+' · '+((q.days[d]||[]).includes(id)?'✓ 達成':isPausedDay(t,d)?'お休み':'未達成'));
      if(v!==undefined)li.append(node('span',' · '+(meta?.label||t.fieldLabel||'記録')+'：'+v+(meta?.unit||'')));
      history.append(li);
    }
    if(!sorted.length)history.append(node('li','まだ記録がありません。'));
    body.append(history);
  }
  return {openDetail,openManage,refresh};
}
