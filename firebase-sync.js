// Passwords are managed solely by Firebase Authentication.
import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,EmailAuthProvider,reauthenticateWithCredential,updatePassword} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {getFirestore,collection,doc,setDoc,getDocFromServer,getDocs,getDocsFromServer,onSnapshot,runTransaction,serverTimestamp,query,orderBy,limit,startAfter,deleteDoc} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
import {accountAddress,normalizeAccountId} from './account-id.js';
import {ownedRecord,groupStorageKey} from './account-compat.js';
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

const accountRef=uid=>doc(db,'users',uid);
const personalRef=(uid,name)=>doc(db,'users',uid,'progress',name);
const familyRef=id=>doc(db,'families',id);
const memberRef=(id,uid)=>doc(db,'families',id,'members',uid);
const metadata=s=>({fromCache:s.metadata.fromCache,hasPendingWrites:s.metadata.hasPendingWrites});
const validCode=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{24}$/.test(value);
const reactionText='__mogumogu_like_v1__';
const isLike=item=>item.id.startsWith('_like_')&&item.text===reactionText;
export async function currentAccount(){
  await auth.authStateReady();const current=auth.currentUser;
  if(!current||current.isAnonymous)return null;
  const snapshot=await getDocFromServer(accountRef(current.uid));
  return {user:current,data:snapshot.exists()?snapshot.data():null};
}
export async function loginAccount(id,password){await signInWithEmailAndPassword(auth,accountAddress(id),password);return currentAccount();}
export async function registerAccount(id,password){
  id=normalizeAccountId(id);
  if(password.length<10)throw Object.assign(new Error('weak-password'),{code:'auth/weak-password'});
  await createUserWithEmailAndPassword(auth,accountAddress(id),password);return ensureAccount();
}
export async function ensureAccount(){
  const account=await currentAccount();if(!account)throw new Error('account-required');
  if(account.data)return account;
  const current=account.user;
  const data=await runTransaction(db,async tx=>{
    const ref=accountRef(current.uid),old=await tx.get(ref);if(old.exists())return old.data();
    const value={accountId:current.email.split('@')[0],createdAt:serverTimestamp()};tx.set(ref,value);return value;
  });return {...account,data};
}
export async function logoutAccount(){await signOut(auth);}
export async function changeAccountPassword(oldPassword,newPassword){
  if(newPassword.length<10)throw Object.assign(new Error('weak-password'),{code:'auth/weak-password'});
  const current=auth.currentUser;await reauthenticateWithCredential(current,EmailAuthProvider.credential(current.email,oldPassword));await updatePassword(current,newPassword);
}
export function personalContext(account){
  const uid=account.user.uid,gref=personalRef(uid,'game'),qref=personalRef(uid,'quests'),meals=collection(db,'users',uid,'meals');
  const owned=s=>ownedRecord(s.exists()?s.data():null,uid);
  return {uid,profile:uid,isAccount:true,
    watchGame:(cb,error)=>onSnapshot(gref,{includeMetadataChanges:true},s=>cb(owned(s),metadata(s)),error),
    watchQuests:(cb,error)=>onSnapshot(qref,{includeMetadataChanges:true},s=>cb(owned(s),metadata(s)),error),
    updateGame:callback=>runTransaction(db,async tx=>{const s=await tx.get(gref),next=callback(owned(s));if(next===null)return null;tx.set(gref,ownedRecord(next,uid));return next;}),
    updateAdventure:callback=>runTransaction(db,async tx=>{const q=await tx.get(qref),g=await tx.get(gref),next=callback(owned(q),owned(g));if(!next)return null;tx.set(qref,ownedRecord(next.quests,uid));if(next.game)tx.set(gref,ownedRecord(next.game,uid));return next;}),
    saveMeal:entry=>setDoc(doc(meals,entry.id),ownedRecord(entry,uid)),deleteMeal:id=>deleteDoc(doc(meals,id)),
    watch:(cb,error)=>onSnapshot(meals,{includeMetadataChanges:true},s=>cb(s.docs.map(x=>ownedRecord(x.data(),uid)),{fromCache:s.metadata.fromCache,confirmedIds:s.docs.filter(x=>!x.metadata.hasPendingWrites).map(x=>x.id)}),error),
    ready:()=>Promise.all([getDocFromServer(gref),getDocFromServer(qref),getDocsFromServer(meals)])
  };
}
async function chatAccount(){const account=await currentAccount();if(!account?.data)throw new Error('account-required');return account;}
function newFamilyCode(){const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');}
export function savedGroups(){
  try{const value=JSON.parse(localStorage.getItem(groupStorageKey(auth.currentUser.uid))||'[]');return Array.isArray(value)?value.filter(g=>validCode(g.id)&&typeof g.name==='string'):[];}catch{return [];}
}
async function rememberGroup(id,name){
  const account=await chatAccount(),groups=savedGroups(),old=groups.find(g=>g.id===id);
  if(old){if(name)old.name=name;}else groups.push({id,name:name||'グループ '+(groups.length+1)});
  await setDoc(doc(db,'users',account.user.uid,'groups',id),{name:groups.find(g=>g.id===id).name});
  localStorage.setItem(groupStorageKey(account.user.uid),JSON.stringify(groups));
}
export async function restoreAccountGroups(account){
  const records=await getDocsFromServer(collection(db,'users',account.user.uid,'groups'));
  localStorage.setItem(groupStorageKey(account.user.uid),JSON.stringify(records.docs.map(s=>({id:s.id,...s.data()}))));
}
function watchMessages(id,onValue,onError){
  const messages=collection(db,'families',id,'messages');let active=true,revision=0;
  const stop=onSnapshot(query(messages,orderBy('createdAt','desc'),limit(100)),async snapshot=>{
    const current=++revision;
    try{let page=snapshot.docs,visible=[],likes=new Map();
      while(page.length){
        for(const row of page){const item={...row.data(),id:row.id};
          if(isLike(item)){const target=item.id.match(/^_like_([A-Za-z0-9]{20})_/);if(!target||!item.senderUid)continue;if(!likes.has(target[1]))likes.set(target[1],[]);likes.get(target[1]).push(item.senderUid);}
          else if(item.senderUid&&item.senderId)visible.push(item);
        }
        if(visible.length>=100||page.length<100)break;
        page=(await getDocs(query(messages,orderBy('createdAt','desc'),startAfter(page.at(-1)),limit(100)))).docs;
        if(!active||current!==revision)return;
      }
      if(!active||current!==revision)return;
      visible=visible.slice(0,100);for(const item of visible)item.likes=likes.get(item.id)||[];onValue(visible.reverse());
    }catch(error){if(active&&current===revision)onError?.(error);}
  },onError);return ()=>{active=false;revision++;stop();};
}
function chatContext(id,account){
  const uid=account.user.uid,senderId=account.data.accountId;
  const message=(text,cardId='')=>({senderUid:uid,senderId,text,cardId,createdAt:serverTimestamp()});
  return {familyId:id,uid,watchMessages:(cb,error)=>watchMessages(id,cb,error),
    sendMessage:(text,cardId='')=>setDoc(doc(collection(db,'families',id,'messages')),message(text,cardId)),
    likeMessage:messageId=>runTransaction(db,async tx=>{
      if(!/^[A-Za-z0-9]{20}$/.test(messageId))throw new Error('message-id');
      const ref=doc(db,'families',id,'messages','_like_'+messageId+'_'+uid),target=await tx.get(doc(db,'families',id,'messages',messageId)),old=await tx.get(ref);
      if(!target.exists()||isLike({...target.data(),id:messageId}))throw new Error('message-missing');if(old.exists())return false;
      tx.set(ref,message(reactionText));return true;
    })};
}
async function ensureMember(id){
  const account=await chatAccount(),uid=account.user.uid,ref=memberRef(id,uid),old=await getDocFromServer(ref);
  // Existing UID memberships remain valid; their old profile field is ignored.
  if(!old.exists())await setDoc(ref,{uid,joinedAt:serverTimestamp()});
  await rememberGroup(id);return chatContext(id,account);
}
export async function renameGroup(id,name){if(!validCode(id)||!name.trim()||name.trim().length>30)throw new Error('group-name');await rememberGroup(id,name.trim());}
export async function joinChatGroup(code,name){const id=code.trim();if(!validCode(id))throw new Error('group-code');const ctx=await ensureMember(id);if(name)await rememberGroup(id,name.trim().slice(0,30));return ctx;}
export async function createChatGroup(name){const account=await chatAccount(),id=newFamilyCode();await setDoc(familyRef(id),{createdBy:account.user.uid,createdAt:serverTimestamp()});const ctx=await ensureMember(id);await rememberGroup(id,name.trim().slice(0,30)||'新しいグループ');return ctx;}
