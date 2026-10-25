import {PUSH_WORKER_URL} from './push-config.js';
import {savePushSubscription,removePushSubscription} from './firebase-sync.js';

const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
const key=uid=>'mogumogu-push-device-'+uid;
const base=()=>PUSH_WORKER_URL.replace(/[/]$/,'');
const isIos=()=>/iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function deviceId(uid){
  let value=localStorage.getItem(key(uid));
  if(!/^[a-f0-9]{32}$/.test(value||'')){
    const bytes=crypto.getRandomValues(new Uint8Array(16));
    value=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    localStorage.setItem(key(uid),value);
  }
  return value;
}
function decodeKey(value){
  const str=value.replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(str.padEnd(Math.ceil(str.length/4)*4,'=')),x=>x.charCodeAt(0));
}
function supported(){
  return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&
    (!isIos()||standalone());
}
async function serviceWorker(){
  await navigator.serviceWorker.register(new URL('./sw.js',import.meta.url).href);
  return navigator.serviceWorker.ready;
}
async function workerConfig(){
  const response=await fetch(base()+'/config',{cache:'no-store'});
  if(!response.ok)throw Error('通知サーバーの設定を取得できませんでした。');
  const value=await response.json();
  if(!value.vapidPublicKey)throw Error('通知サーバーの鍵が未設定です。');
  return value;
}
async function enable(uid){
  // Permission must be requested in the direct button click handler.
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw Error('端末の通知が許可されていません。端末の設定をご確認ください。');
  const [{vapidPublicKey},registration]=await Promise.all([workerConfig(),serviceWorker()]);
  const existing=await registration.pushManager.getSubscription();
  const subscription=existing||await registration.pushManager.subscribe({
    userVisibleOnly:true,applicationServerKey:decodeKey(vapidPublicKey)
  });
  try{await savePushSubscription(deviceId(uid),subscription);}
  catch(error){if(!existing)await subscription.unsubscribe();throw error;}
}
async function disable(uid){
  const registration=await serviceWorker();
  await removePushSubscription(deviceId(uid));
  const subscription=await registration.pushManager.getSubscription();
  if(subscription)await subscription.unsubscribe();
}
export async function mountPushSettings(){
  const uid=window.MogumoguAccount?.uid,settings=document.querySelector('[data-panel="history"] .sound-controls');
  if(!uid||!settings)return;
  const wrapper=el('div','','push-settings'),title=el('h3','💬 グループチャット通知'),
    description=el('p','新着メッセージをこの端末に通知します。自分の投稿や「いいね」は通知しません。','small'),
    status=el('p','','small'),button=el('button','通知を有効にする','btn secondary');
  status.setAttribute('role','status');button.type='button';
  wrapper.append(title,description,button,status);
  settings.after(wrapper);
  if(!PUSH_WORKER_URL){
    status.textContent='通知サーバーの接続準備中です。';button.disabled=true;return;
  }
  if(!supported()){
    status.textContent=isIos()&&!standalone()?'iPhone・iPadは「ホーム画面に追加」してから設定してください。':'このブラウザはプッシュ通知に対応していません。';
    button.disabled=true;return;
  }
  async function refresh(){
    if(Notification.permission==='denied'){
      status.textContent='通知がブロックされています。端末の設定から許可してください。';
      button.textContent='通知を有効にする';button.disabled=true;return;
    }
    try{
      const registration=await serviceWorker();
      const subscription=await registration.pushManager.getSubscription();
      button.textContent=subscription?'この端末の通知を停止':'通知を有効にする';
      status.textContent=subscription?'この端末の通知は登録されています。':'この端末では通知が未登録です。';
      button.dataset.enabled=subscription?'1':'0';
    }catch{status.textContent='通知の状態を確認できません。';}
  }
  button.addEventListener('click',async()=>{
    const turningOn=button.dataset.enabled!=='1';
    button.disabled=true;
    status.textContent=turningOn?'通知を登録しています…':'通知を解除しています…';
    try{
      if(turningOn)await enable(uid);else await disable(uid);
      await refresh();
    }catch(error){status.textContent=error.message||'通知設定を更新できませんでした。';}
    finally{button.disabled=false;}
  });
  await refresh();
}
export async function unregisterCurrentDeviceBeforeLogout(){
  const uid=window.MogumoguAccount?.uid;
  if(!uid||!supported()||!PUSH_WORKER_URL)return;
  try{await disable(uid);}catch{/* Logout must still be possible if offline. */}
}
