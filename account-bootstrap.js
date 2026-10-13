import {currentAccount,personalContext,importLegacyProgress,legacyAccountSource,restoreAccountGroups,logoutAccount,changeAccountPassword} from './firebase-sync.js';
import {localContext} from './progress-store.js';
import {accountError} from './account-id.js';
const profile=document.body.dataset.profile;
const main=document.querySelector('main');
main.inert=true;
const status=document.createElement('p');status.className='account-loading';status.setAttribute('role','status');status.textContent='記録を読み込んでいます…';document.body.prepend(status);
function legacyMeals(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open('mogumogu-diary',1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('meals'))req.result.createObjectStore('meals',{keyPath:'id'});};
  req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,r=db.transaction('meals').objectStore('meals').getAll();r.onsuccess=()=>{resolve(r.result.filter(x=>x.profile===profile));db.close();};r.onerror=()=>{reject(r.error);db.close();};};
});}
async function start(){
  const account=await currentAccount();
  if(!account?.data){location.replace('../../account.html?profile='+profile);return;}
  if(account.data.profile!==profile){location.replace('../'+account.data.profile+'/'+location.search+location.hash);return;}
  const ctx=personalContext(account);
  const importKey='mogumogu:account-import:'+account.user.uid;
  if(localStorage.getItem(importKey)===profile){
    status.textContent='以前の記録を引き継いでいます…';
    const local=localContext(profile),bundle=local.snapshot();
    // Persist the source ID before the first request; even empty accounts retry
    // using the same ID. A second account cannot claim an already imported source.
    const ownerKey='mogumogu:account-import-owner:'+bundle.id,owner=localStorage.getItem(ownerKey);
    if(owner&&owner!==account.user.uid)throw new Error('import-owner');
    localStorage.setItem(ownerKey,account.user.uid);
    const source=await legacyAccountSource(profile,bundle);
    await importLegacyProgress(account,source.bundle,[...await legacyMeals(),...source.meals]);
    await restoreAccountGroups(account,true);
    localStorage.removeItem(importKey);
  }
  await ctx.ready();
  await restoreAccountGroups(account);
  window.MogumoguAccount={context:ctx,id:account.data.accountId,uid:account.user.uid};
  document.querySelector('.greeting').textContent='🍙 '+account.data.accountId+'の毎日';
  document.title='モグモグデイリークエスト';
  const label=document.getElementById('accountName');if(label)label.textContent=account.data.accountId;
  const logout=document.getElementById('accountLogout');if(logout)logout.onclick=async()=>{logout.disabled=true;try{await logoutAccount();location.replace('../../account.html?login=1');}catch(e){logout.disabled=false;document.getElementById('accountSettingsStatus').textContent=accountError(e);}};
  const form=document.getElementById('passwordForm');if(form)form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await changeAccountPassword(document.getElementById('oldPassword').value,document.getElementById('newPassword').value);form.reset();document.getElementById('accountSettingsStatus').textContent='パスワードを変更しました。';}catch(error){document.getElementById('accountSettingsStatus').textContent=accountError(error);}finally{button.disabled=false;}};
  // All feature scripts start only after identity, migration and server reads.
  // No local wallet can flash or earn rewards while account restoration is pending.
  await import('./app.js');
  await Promise.all([import('./game.js'),import('./adventure.js'),import('./ssr-prism-trial.js'),import('./card-layer-lab.js')]);
  main.inert=false;status.remove();
}
start().catch(error=>{
  status.textContent=error?.message==='import-owner'?'このブラウザの記録は別のアカウントで引き継ぎ済みです。':'記録を読み込めませんでした。';
  const retry=document.createElement('button');retry.className='btn secondary';retry.textContent='もう一度試す';retry.onclick=()=>location.reload();
  const login=document.createElement('button');login.className='btn secondary';login.textContent='ログインし直す';login.onclick=async()=>{await logoutAccount();location.replace('../../account.html?login=1&profile='+profile);};
  status.append(document.createElement('br'),retry,login);
});
