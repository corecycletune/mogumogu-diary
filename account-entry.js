import {currentAccount,ensureAccount,loginAccount,registerAccount} from './firebase-sync.js';
import {normalizeAccountId,accountError} from './account-id.js';
const el=id=>document.getElementById(id);
let registering=false,busy=false;
function render(){
  if(el('accountStatus').textContent==='ログイン画面を準備しています…')el('accountStatus').textContent='';
  el('accountTitle').textContent=registering?'はじめまして':'おかえりなさい';
  el('accountSubmit').textContent=registering?'登録してはじめる':'ログイン';
  el('accountSwitch').textContent=registering?'登録済みの方はこちら':'はじめての方はこちら';
  el('accountConfirm').hidden=el('accountConfirmLabel').hidden=!registering;
  el('accountConfirm').required=registering;
  el('accountPassword').autocomplete=registering?'new-password':'current-password';
  el('accountRecovery').hidden=!registering;
  el('accountSubmit').disabled=el('accountSwitch').disabled=busy;
}
function enter(account){location.replace('./p/app/'+(account.isAdmin?'?dev=1#developer':''));}
el('accountSwitch').onclick=()=>{registering=!registering;el('accountStatus').textContent='';render();};
el('accountForm').onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  if(registering&&el('accountPassword').value!==el('accountConfirm').value){el('accountStatus').textContent='確認用パスワードが一致しません。';return;}
  busy=true;render();el('accountStatus').textContent='接続しています…';
  try{
    const id=normalizeAccountId(el('accountId').value),password=el('accountPassword').value;
    let account=registering?await registerAccount(id,password):await loginAccount(id,password);
    if(!account.data)account=await ensureAccount(); // retry after interrupted registration
    el('accountPassword').value=el('accountConfirm').value='';enter(account);
  }catch(error){el('accountStatus').textContent=accountError(error);}
  finally{busy=false;render();}
};
render();
try{const account=await currentAccount();if(account?.data&&!new URLSearchParams(location.search).has('login'))enter(account);}
catch(error){el('accountStatus').textContent=accountError(error);}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
