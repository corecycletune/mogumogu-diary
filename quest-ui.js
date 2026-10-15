import {taskStatus,activeCount,totalDone,bestStreak,streakFor,nextMilestone,localDay} from './quest-core.js';
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
