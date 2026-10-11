// Firebase is loaded only when a user opens cloud setup or reconnects.
// This app deliberately never includes service-account credentials.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, deleteDoc, onSnapshot, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

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
function context(familyId, profile) {
  return {
    familyId,
    profile,
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
async function ensureMember(familyId, profile) {
  const current = await user();
  const ref = memberRef(familyId, current.uid);
  const old = await getDoc(ref);
  if (old.exists()) {
    if (old.data().profile !== profile) throw new Error("この端末の匿名IDは別のプロフィールに登録済みです。");
  } else {
    await setDoc(ref, { profile, joinedAt: serverTimestamp() });
  }
  localStorage.setItem(key(profile), familyId);
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
