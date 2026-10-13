import {currentAccount,ensureAccount,loginAccount,registerAccount} from './firebase-sync.js';
import {normalizeAccountId,accountError} from './account-id.js';
const el=id=>document.getElementById(id);
const selected=new URLSearchParams(location.search).get('profile');
const profile=['jun','ichika','sato'].includes(selected)?selected:'jun';
const legacyProfiles=['jun','ichika','sato'].filter(name=>localStorage.getItem('mogumogu:progress:'+name)||localStorage.getItem('mogumogu:family:'+name));
for(const name of legacyProfiles)el('legacyProfile').add(new Option(({jun:'じゅんちゃん',ichika:'いちか',sato:'さとばぁば'})[name],name));
let registering=false,busy=false;
el('accountImport').addEventListener('change',()=>el('accountImport').dataset.touched='yes');
function render(){
  if(el('accountStatus').textContent==='ログイン画面を準備しています…')el('accountStatus').textContent='';
  el('accountTitle').textContent=registering?'はじめまして':'おかえりなさい';
  el('accountSubmit').textContent=registering?'登録してはじめる':'ログイン';
  el('accountSwitch').textContent=registering?'登録済みの方はこちら':'はじめての方はこちら';
  el('accountConfirm').hidden=el('accountConfirmLabel').hidden=!registering;
  el('accountConfirm').required=registering;
  el('accountPassword').autocomplete=registering?'new-password':'current-password';
  el('accountRecovery').hidden=!registering;
  // Importing into a new account is offered explicitly. Logging into an existing
  // account never auto-imports somebody else's progress from the same browser.
  el('accountImportLabel').hidden=!registering||(!selected&&!legacyProfiles.length);
  el('legacyProfileLabel').hidden=el('legacyProfile').hidden=!registering||!!selected||!legacyProfiles.length;
  if(registering&&!el('accountImportLabel').hidden&&!el('accountImport').dataset.touched)el('accountImport').checked=true;
  el('accountSubmit').disabled=el('accountSwitch').disabled=busy;
}
function enter(account){location.replace('./p/'+account.data.profile+'/');}
el('accountSwitch').onclick=()=>{registering=!registering;el('accountStatus').textContent='';render();};
el('accountForm').onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  if(registering&&el('accountPassword').value!==el('accountConfirm').value){el('accountStatus').textContent='確認用パスワードが一致しません。';return;}
  busy=true;const shouldImport=registering&&el('accountImport').checked;const chosenProfile=shouldImport&&!selected&&legacyProfiles.length?el('legacyProfile').value:profile;render();el('accountStatus').textContent='接続しています…';
  try{
    const id=normalizeAccountId(el('accountId').value),password=el('accountPassword').value;
    let account=registering?await registerAccount(id,password,chosenProfile):await loginAccount(id,password);
    if(!account.data)account=await ensureAccount(chosenProfile); // retry after interrupted registration
    if(shouldImport)localStorage.setItem('mogumogu:account-import:'+account.user.uid,chosenProfile);
    el('accountPassword').value=el('accountConfirm').value='';enter(account);
  }catch(error){el('accountStatus').textContent=accountError(error);}
  finally{busy=false;render();}
};
render();
try{const account=await currentAccount();if(account?.data&&!new URLSearchParams(location.search).has('login'))enter(account);}
catch(error){el('accountStatus').textContent=accountError(error);}
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
