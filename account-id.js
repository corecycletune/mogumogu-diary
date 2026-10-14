// A non-deliverable internal address lets Firebase own password hashing and login.
// Users enter a username; this address is never used for email or password reset.
export function normalizeAccountId(value){
  const id=String(value).trim().toLowerCase();
  if(!/^[a-z0-9_]{3,24}$/.test(id))throw new Error('account-id');
  return id;
}
export function accountAddress(value){return normalizeAccountId(value)+'@id.mogumogu.invalid';}
export function accountError(error){
  const code=error?.code||error?.message;
  return ({'reserved-id':'adminは管理者専用IDです。管理者用の作成手順を使ってください。',
    'account-id':'IDは半角英数字・_の3〜24文字で入力してください。',
    'auth/email-already-in-use':'このIDは使われています。別のIDを入力してください。',
    'auth/invalid-credential':'IDまたはパスワードが違います。',
    'auth/wrong-password':'IDまたはパスワードが違います。',
    'auth/user-not-found':'IDまたはパスワードが違います。',
    'auth/weak-password':'パスワードは10文字以上で入力してください。',
    'auth/too-many-requests':'少し時間をおいて、もう一度お試しください。',
    'auth/network-request-failed':'通信できません。接続を確認してもう一度お試しください。',
    'permission-denied':'保存先に接続できません。もう一度お試しください。'
  })[code]||'接続できませんでした。もう一度お試しください。';
}

export function registrationAccountId(value){const id=normalizeAccountId(value);if(id==='admin')throw new Error('reserved-id');return id;}
