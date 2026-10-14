// The account object is populated only after a server read of roles/{UID}.
// UI gates are not server authorization; Firestore rules independently check roles.
export function canUseDevTools(account){return !!account?.uid && account.isAdmin===true;}
export function isDevModeEnabled(account,search){
  return canUseDevTools(account)&&new URLSearchParams(search).get('dev')==='1';
}
