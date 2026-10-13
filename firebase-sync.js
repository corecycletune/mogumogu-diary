// Firebase is loaded only when a user opens cloud setup or reconnects.
// This app deliberately never includes service-account credentials.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, linkWithCredential, EmailAuthProvider, signOut, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocFromServer, getDocs, getDocsFromServer, documentId, where, startAfter, deleteDoc, onSnapshot, runTransaction, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

const config = {
  apiKey: "AIzaSyA6yTBzzI8WrVrkX1ubJ1HsptS1S1ieelA",
  authDomain: "mogumogu-diary.firebaseapp.com",
  projectId: "mogumogu-diary",
  storageBucket: "mogumogu-diary.firebasestorage.app",
  messagingSenderId: "841964260268",
  appId: "1:841964260268:web:d178348a96cea6eb0ac809"
};

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const users = ["ichika", "jun", "sato"];
const key = profile => "mogumogu:family:" + profile;
const validCode = value => typeof value === "string" && /^[A-Za-z0-9_-]{24}$/.test(value);

function newFamilyCode() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function user() {
  if (auth.currentUser) return auth.currentUser;
  await auth.authStateReady();
  return auth.currentUser || (await signInAnonymously(auth)).user;
}
const familyRef = familyId => doc(db, "families", familyId);
const memberRef = (familyId, uid) => doc(db, "families", familyId, "members", uid);
const mealRef = (familyId, id) => doc(db, "families", familyId, "meals", id);
const gameRef = (familyId, profile) => doc(db, "families", familyId, "games", profile);
const reactionText='__mogumogu_like_v1__';
const likeId=(id,identity)=>'_like_'+id+'_'+identity;
const isLike=item=>/^_like_[A-Za-z0-9]{20}_[A-Za-z0-9]{20,128}$/.test(item.id)&&item.text===reactionText ||
  /^_like_[A-Za-z0-9]{20}_(jun|ichika|sato)$/.test(item.id)&&item.text===reactionText;
function watchFamilyMessages(familyId,onValue,onError){
  const messages=collection(db,'families',familyId,'messages');let active=true,revision=0;
  const stop=onSnapshot(query(messages,orderBy('createdAt','desc'),limit(100)),async snapshot=>{
    const current=++revision;
    try{
      let page=snapshot.docs,visible=[],likes=new Map();
      // Reactions and messages share the existing collection. Read a page once
      // and collect both, including the old profile-scoped reaction records.
      while(page.length){
        for(const docItem of page){
          const item={...docItem.data(),id:docItem.id};
          if(isLike(item)){
            const target=item.id.match(/^_like_([A-Za-z0-9]{20})_/)[1];
            if(!likes.has(target))likes.set(target,[]);
            likes.get(target).push(item.senderUid||'legacy:'+item.sender);
          }else visible.push(item);
        }
        if(visible.length>=100||page.length<100)break;
        const next=await getDocs(query(messages,orderBy('createdAt','desc'),startAfter(page.at(-1)),limit(100)));page=next.docs;
        if(!active||current!==revision)return;
      }
      visible=visible.slice(0,100);
      if(!active||current!==revision)return;
      for(const item of visible)item.likes=likes.get(item.id)||[];
      onValue(visible.reverse());
    }catch(error){if(active&&current===revision)onError?.(error);}
  },onError);
  return ()=>{active=false;revision++;stop();};
}
function context(familyId, profile) {
  const identity=auth.currentUser?.uid||profile;
  const account=auth.currentUser&&!auth.currentUser.isAnonymous;
  const senderInfo=()=>account?{senderUid:identity,senderId:auth.currentUser.email.split('@')[0]}:{};
  return {
    familyId,
    profile,
    uid:identity,
    watchQuests: (onValue,onError) => onSnapshot(doc(db,'families',familyId,'adventures',profile), {includeMetadataChanges:true},
      snapshot=>onValue(snapshot.exists()?snapshot.data():null,{fromCache:snapshot.metadata.fromCache,hasPendingWrites:snapshot.metadata.hasPendingWrites}),onError),
    updateAdventure: callback => runTransaction(db,async transaction=>{
      const qref=doc(db,'families',familyId,'adventures',profile),gref=gameRef(familyId,profile);
      const q=await transaction.get(qref),g=await transaction.get(gref);
      const next=callback(q.exists()?q.data():null,g.exists()?g.data():null);
      if(!next)return null;
      transaction.set(qref,next.quests);
      if(next.game)transaction.set(gref,next.game);
      return next;
    }),
    watchMessages: (onValue,onError) => watchFamilyMessages(familyId,onValue,onError),
    likeMessage: id => runTransaction(db,async transaction=>{
      if(!/^[A-Za-z0-9]{20}$/.test(id))throw new Error('message-id');
      const ref=doc(db,'families',familyId,'messages',likeId(id,identity));
      const target=await transaction.get(doc(db,'families',familyId,'messages',id)),old=await transaction.get(ref);
      if(!target.exists()||isLike({...target.data(),id}))throw new Error('message-missing');
      if(old.exists())return false;
      transaction.set(ref,{sender:profile,text:reactionText,cardId:'',createdAt:serverTimestamp(),...senderInfo()});return true;
    }),
    sendMessage: (text,cardId='') => setDoc(doc(collection(db,'families',familyId,'messages')),{sender:profile,text,cardId,createdAt:serverTimestamp(),...senderInfo()}),
    saveMeal: entry => setDoc(mealRef(familyId, entry.id), entry),
    deleteMeal: id => deleteDoc(mealRef(familyId, id)),
    watchGame: (onValue,onError) => onSnapshot(gameRef(familyId, profile), {includeMetadataChanges:true},
      snapshot => onValue(snapshot.exists()?snapshot.data():null,{
        fromCache:snapshot.metadata.fromCache,
        hasPendingWrites:snapshot.metadata.hasPendingWrites
      }),onError),
    updateGame: callback => runTransaction(db,async transaction=>{
      const ref=gameRef(familyId,profile);
      const snap=await transaction.get(ref);
      const next=callback(snap.exists()?snap.data():null);
      if(next===null)return null;
      transaction.set(ref,next);
      return next;
    }),
    watch: (onItems, onError) => onSnapshot(
      collection(db, "families", familyId, "meals"),
      {includeMetadataChanges: true},
      snapshot => onItems(
        snapshot.docs.map(item => item.data()),
        {
          fromCache: snapshot.metadata.fromCache,
          confirmedIds: snapshot.docs
            .filter(item => !item.metadata.hasPendingWrites)
            .map(item => item.id)
        }
      ),
      onError
    )
  };
}
async function ensureMember(familyId, profile, activate=true) {
  const current = await user();
  const ref = memberRef(familyId, current.uid);
  const old = await getDoc(ref);
  if (old.exists()) {
    if (old.data().profile !== profile) throw new Error("この端末の匿名IDは別のプロフィールに登録済みです。");
  } else {
    await setDoc(ref, { profile, joinedAt: serverTimestamp() });
  }
  if(activate)localStorage.setItem(key(profile), familyId);
  await rememberGroup(profile,familyId);
  return context(familyId, profile);
}
export function savedFamilyCode(profile) {
  return localStorage.getItem(key(profile));
}
export async function createFamily(profile) {
  if (profile !== "jun") throw new Error("最初の家族グループは「じゅんちゃん」から作成してください。");
  const current = await user();
  const familyId = newFamilyCode();
  await setDoc(familyRef(familyId), { createdBy: current.uid, createdAt: serverTimestamp() });
  return await ensureMember(familyId, profile);
}
export async function joinFamily(profile, rawCode) {
  if (!users.includes(profile)) throw new Error("プロフィールが正しくありません。");
  const familyId = rawCode.trim();
  if (!validCode(familyId)) throw new Error("家族コードは24文字です。もう一度確認してください。");
  return await ensureMember(familyId, profile);
}
export async function resumeFamily(profile) {
  const code = savedFamilyCode(profile);
  return code ? joinFamily(profile, code) : null;
}

const groupsKey=profile=>'mogumogu:groups:'+(auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid+':':'')+profile;
export function savedGroups(profile){
  const value=JSON.parse(localStorage.getItem(groupsKey(profile))||'[]');
  return Array.isArray(value)?value.filter(group=>validCode(group.id)&&typeof group.name==='string'):[];
}
async function rememberGroup(profile,id,name){
  const groups=savedGroups(profile),old=groups.find(group=>group.id===id);
  if(old){if(name)old.name=name;}else groups.push({id,name:name||'グループ '+(groups.length+1)});
  if(auth.currentUser&&!auth.currentUser.isAnonymous)await setDoc(doc(db,'users',auth.currentUser.uid,'groups',id),{name:groups.find(group=>group.id===id).name});
  localStorage.setItem(groupsKey(profile),JSON.stringify(groups));
}
export async function renameGroup(profile,id,name){if(!validCode(id)||!name.trim()||name.trim().length>30)throw new Error('group-name');await rememberGroup(profile,id,name.trim());}
export async function joinChatGroup(profile,code,name){
  const id=code.trim();if(!users.includes(profile)||!validCode(id))throw new Error('group-code');
  const ctx=await ensureMember(id,profile,false);if(name)await rememberGroup(profile,id,name.trim().slice(0,30));return ctx;
}
export async function createChatGroup(profile,name){
  if(!users.includes(profile))throw new Error('profile');
  const current=await user(),id=newFamilyCode();
  await setDoc(familyRef(id),{createdBy:current.uid,createdAt:serverTimestamp()});
  const ctx=await ensureMember(id,profile,false);await rememberGroup(profile,id,name.trim().slice(0,30)||'新しいグループ');return ctx;
}

// Personal progress is independent of group membership. Passwords are held only
// by Firebase Authentication, never in Firestore or localStorage.
const accountRef=uid=>doc(db,'users',uid);
const personalRef=(uid,name)=>doc(db,'users',uid,'progress',name);
const metadata=snap=>({fromCache:snap.metadata.fromCache,hasPendingWrites:snap.metadata.hasPendingWrites});
export async function currentAccount(){
  await auth.authStateReady();
  const current=auth.currentUser;
  if(!current||current.isAnonymous)return null;
  const snapshot=await getDocFromServer(accountRef(current.uid));
  return {user:current,data:snapshot.exists()?snapshot.data():null};
}
export async function loginAccount(id,password){
  const {accountAddress}=await import('./account-id.js');
  await signInWithEmailAndPassword(auth,accountAddress(id),password);
  return currentAccount();
}
export async function registerAccount(id,password,profile){
  const {accountAddress}=await import('./account-id.js');
  if(password.length<10)throw Object.assign(new Error('weak-password'),{code:'auth/weak-password'});
  await auth.authStateReady();
  const address=accountAddress(id),credential=EmailAuthProvider.credential(address,password);
  if(auth.currentUser?.isAnonymous)await linkWithCredential(auth.currentUser,credential);
  else await createUserWithEmailAndPassword(auth,address,password);
  return ensureAccount(profile);
}
export async function ensureAccount(profile){
  if(!users.includes(profile))throw new Error('profile');
  const current=auth.currentUser;
  if(!current||current.isAnonymous)throw new Error('account-required');
  const data=await runTransaction(db,async tx=>{
    const ref=accountRef(current.uid),old=await tx.get(ref);
    if(old.exists())return old.data();
    const value={profile,accountId:current.email.split('@')[0],createdAt:serverTimestamp()};
    tx.set(ref,value);return value;
  });
  return {user:current,data};
}
export async function logoutAccount(){await signOut(auth);}
export async function changeAccountPassword(oldPassword,newPassword){
  if(newPassword.length<10)throw Object.assign(new Error('weak-password'),{code:'auth/weak-password'});
  const current=auth.currentUser;
  await reauthenticateWithCredential(current,EmailAuthProvider.credential(current.email,oldPassword));
  await updatePassword(current,newPassword);
}
export function personalContext(account){
  const uid=account.user.uid,profile=account.data.profile;
  const gref=personalRef(uid,'game'),qref=personalRef(uid,'quests');
  const meals=collection(db,'users',uid,'meals');
  return {uid,profile,isAccount:true,
    watchGame:(cb,error)=>onSnapshot(gref,{includeMetadataChanges:true},s=>cb(s.exists()?s.data():null,metadata(s)),error),
    watchQuests:(cb,error)=>onSnapshot(qref,{includeMetadataChanges:true},s=>cb(s.exists()?s.data():null,metadata(s)),error),
    updateGame:callback=>runTransaction(db,async tx=>{const s=await tx.get(gref),next=callback(s.exists()?s.data():null);if(next===null)return null;tx.set(gref,next);return next;}),
    updateAdventure:callback=>runTransaction(db,async tx=>{const q=await tx.get(qref),g=await tx.get(gref),next=callback(q.exists()?q.data():null,g.exists()?g.data():null);if(!next)return null;tx.set(qref,next.quests);if(next.game)tx.set(gref,next.game);return next;}),
    saveMeal:entry=>setDoc(doc(meals,entry.id),entry),deleteMeal:id=>deleteDoc(doc(meals,id)),
    watch:(cb,error)=>onSnapshot(meals,{includeMetadataChanges:true},s=>cb(s.docs.map(x=>x.data()),{fromCache:s.metadata.fromCache,confirmedIds:s.docs.filter(x=>!x.metadata.hasPendingWrites).map(x=>x.id)}),error),
    ready:()=>Promise.all([getDocFromServer(gref),getDocFromServer(qref),getDocsFromServer(meals)])
  };
}
export async function importLegacyProgress(account,bundle,meals){
  const uid=account.user.uid,profile=account.data.profile;
  const {mergeLocalProgress}=await import('./progress-store.js');
  // A stable source ID and server ledger make retries and two tabs idempotent.
  const marker=doc(db,'users',uid,'imports',bundle.id);
  const gref=personalRef(uid,'game'),qref=personalRef(uid,'quests');
  const result=await runTransaction(db,async tx=>{
    const m=await tx.get(marker),q=await tx.get(qref),g=await tx.get(gref);
    if(m.exists())return false;
    const next=mergeLocalProgress(q.exists()?q.data():null,g.exists()?g.data():null,bundle,profile);
    if(next){tx.set(qref,next.quests);tx.set(gref,next.game);}
    tx.set(marker,{completedAt:serverTimestamp()});return true;
  });
  // Meals use stable IDs and insert-only writes. Retrying never overwrites a
  // newer cloud edit. Keep the import request until all records have succeeded.
  for(const entry of meals){
    const ref=doc(db,'users',uid,'meals',entry.id);
    await runTransaction(db,async tx=>{const old=await tx.get(ref);if(!old.exists())tx.set(ref,entry);});
  }
  return result;
}
export async function legacyAccountSource(profile,bundle){
  const code=savedFamilyCode(profile);
  if(!code)return {bundle,meals:[]};
  // Linking the existing anonymous login during registration retains membership.
  // Never enrol an unrelated login in an old group just to import its progress.
  const member=await getDocFromServer(memberRef(code,auth.currentUser.uid));
  if(!member.exists()||member.data().profile!==profile)return {bundle,meals:[]};
  const [g,q,m]=await Promise.all([getDocFromServer(gameRef(code,profile)),getDocFromServer(doc(db,'families',code,'adventures',profile)),getDocsFromServer(query(collection(db,'families',code,'meals'),where('profile','==',profile)))]);
  return {bundle:{...bundle,id:'group-'+code,game:g.exists()?g.data():bundle.game,quests:q.exists()?q.data():bundle.quests},meals:m.docs.map(x=>x.data())};
}

export async function restoreAccountGroups(account,importOld=false){
  const uid=account.user.uid,profile=account.data.profile;
  if(importOld){
    const legacy=JSON.parse(localStorage.getItem('mogumogu:groups:'+profile)||'[]');
    for(const group of legacy){
      if(!validCode(group.id))continue;
      const member=await getDocFromServer(memberRef(group.id,uid));
      if(member.exists()&&member.data().profile===profile)await rememberGroup(profile,group.id,group.name);
    }
  }
  const records=await getDocsFromServer(collection(db,'users',uid,'groups'));
  localStorage.setItem(groupsKey(profile),JSON.stringify(records.docs.map(s=>({id:s.id,...s.data()}))));
}
