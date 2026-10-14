import {currentAccount,ensureAccount,personalContext,restoreAccountGroups,logoutAccount,changeAccountPassword} from './firebase-sync.js';
import {accountError} from './account-id.js';
import {canUseDevTools} from './developer-access.js';
const main=document.querySelector('main');main.inert=true;
const status=document.createElement('p');status.className='account-loading';status.setAttribute('role','status');status.textContent='記録を読み込んでいます…';document.body.prepend(status);
async function start(){
  let account=await currentAccount();
  if(!account){location.replace('../../account.html');return;}
  if(!account.data)account=await ensureAccount();
  const identity={id:account.data.accountId,uid:account.user.uid};
  const ctx=personalContext(account);
  await ctx.ready();
  await restoreAccountGroups(account);
  window.MogumoguAccount={...identity,context:ctx};
  document.querySelectorAll('[data-dev-entry]').forEach(entry=>{entry.hidden=!canUseDevTools(identity);});
  document.querySelector('.greeting').textContent='🍙 '+identity.id+'の毎日';
  document.title='モグモグデイリークエスト';
  document.getElementById('accountName').textContent=identity.id;
  const logout=document.getElementById('accountLogout');logout.onclick=async()=>{logout.disabled=true;try{await logoutAccount();location.replace('../../account.html?login=1');}catch(e){logout.disabled=false;document.getElementById('accountSettingsStatus').textContent=accountError(e);}};
  const form=document.getElementById('passwordForm');form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await changeAccountPassword(document.getElementById('oldPassword').value,document.getElementById('newPassword').value);form.reset();document.getElementById('accountSettingsStatus').textContent='パスワードを変更しました。';}catch(error){document.getElementById('accountSettingsStatus').textContent=accountError(error);}finally{button.disabled=false;}};
  await import('./app.js');
  await Promise.all([import('./game.js'),import('./adventure.js'),import('./ssr-prism-trial.js'),import('./card-layer-lab.js')]);
  main.inert=false;status.remove();
}
start().catch(()=>{
  status.textContent='記録を読み込めませんでした。';
  const retry=document.createElement('button');retry.className='btn secondary';retry.textContent='もう一度試す';retry.onclick=()=>location.reload();
  const login=document.createElement('button');login.className='btn secondary';login.textContent='ログインし直す';login.onclick=async()=>{await logoutAccount();location.replace('../../account.html?login=1');};
  status.append(document.createElement('br'),retry,login);
});
